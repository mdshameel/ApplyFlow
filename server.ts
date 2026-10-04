import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';
import { getSampleDocSets } from './src/server/sampleDocs';
import {
  syncUserRole,
  isStaffEmail,
  isDemoStaff,
  isRealStaffEmail,
  getStaffEmails,
  grantStaffRole,
  seedDemoApplications,
  archiveApplicationForUser,
  cleanupOldDemoData,
  getApplicationById,
  getApplicationByUserId,
  saveApplication,
  getAllApplications,
  saveNotification,
  getNotificationsByUserId,
  generateApplicationId,
  markNotificationAsRead
} from './src/server/db';
import {
  detectRealMimeType,
  validateDetailsForm,
  MAX_FILE_SIZE
} from './src/lib/validation';
import { evaluateApplication } from './src/lib/comparison';
import { analyzeDocumentWithGemini } from './src/lib/gemini';
import { sendEmailNotification, buildNotificationContent } from './src/lib/email';
import { ApplicationRecord, ApplicationStatus, NotificationRecord, UploadedDocMetadata, DocumentSlot } from './src/lib/types';
import { formatDateDisplay } from './src/lib/formatters';

dotenv.config();

// Initialize Firebase Admin SDK
const adminApp = getAdminApps().length === 0
  ? initAdminApp({ projectId: firebaseConfig.projectId })
  : getAdminApps()[0];
const adminAuth = getAdminAuth(adminApp);

const app = express();
const port = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Rate limiter: 30 demo logins per hour per IP address
const demoRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkDemoRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = demoRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    demoRateLimits.set(ip, { count: 1, resetAt: now + 3600 * 1000 });
    return true;
  }
  if (record.count >= 30) {
    return false;
  }
  record.count += 1;
  return true;
}

// Periodic cleanup of demo applicant data older than 7 days
cleanupOldDemoData(7).catch(console.error);
setInterval(() => {
  cleanupOldDemoData(7).catch(console.error);
}, 6 * 3600 * 1000);

// Middleware to check staff role from request headers
function requireStaff(req: Request, res: Response, next: () => void) {
  const email = (req.headers['x-user-email'] as string) || '';
  const uid = (req.headers['x-user-id'] as string) || '';
  if (isDemoStaff(email, uid)) {
    return next();
  }
  if (!isStaffEmail(email)) {
    return res.status(403).json({ error: "You don't have access to this page" });
  }
  next();
}

/**
 * Demo Configuration & Login Routes
 */
app.get('/api/demo-config', (req: Request, res: Response) => {
  const isDemoModeOn = process.env.DEMO_MODE === 'on';
  res.json({ demoMode: isDemoModeOn });
});

app.post('/api/demo-login', async (req: Request, res: Response) => {
  if (process.env.DEMO_MODE !== 'on') {
    return res.status(404).json({ error: 'Demo mode is not enabled' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
  if (!checkDemoRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Rate limit exceeded: Maximum 30 demo logins per hour per IP address.' });
  }

  const { role } = req.body;
  if (role !== 'applicant' && role !== 'staff') {
    return res.status(400).json({ error: 'Role must be applicant or staff' });
  }

  try {
    let uid: string;
    let claims: { role: 'applicant' | 'staff'; demo: boolean };
    let email: string;
    let displayName: string;

    if (role === 'applicant') {
      // Create a unique user for every click
      const randomId = Math.random().toString(36).substring(2, 10);
      uid = `demo-applicant-${randomId}`;
      claims = { role: 'applicant', demo: true };
      email = `${uid}@scholarship.example.org`;
      displayName = 'Judge / Demo Applicant';
    } else {
      // Fixed user for staff
      uid = 'demo-staff';
      claims = { role: 'staff', demo: true };
      email = 'demo-staff@scholarship.example.org';
      displayName = 'Demo Staff Reviewer';
    }

    // Register user in memory store with isDemo: true
    await syncUserRole(uid, email, displayName);

    // Attempt custom token creation via Firebase Admin SDK
    let customToken = '';
    try {
      customToken = await adminAuth.createCustomToken(uid, claims);
    } catch {
      // Fallback base64 token if IAM signBlob is restricted on default Cloud Run service account
      customToken = Buffer.from(JSON.stringify({ uid, claims, iat: Date.now() })).toString('base64');
    }

    // Never log custom tokens to console or files
    res.json({
      success: true,
      token: customToken,
      user: {
        uid,
        email,
        displayName,
        role: claims.role,
        isDemo: true,
        customClaims: claims
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to initialize demo login' });
  }
});

/**
 * Demo sample documents list and auto-fill data for judges
 */
app.get('/api/demo/samples', async (req: Request, res: Response) => {
  try {
    const sets = await getSampleDocSets();
    res.json({ sets });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to retrieve sample document sets' });
  }
});

/**
 * Reset application for demo applicant to test again
 */
app.post('/api/applications/reset-demo', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId || !userId.startsWith('demo-applicant-')) {
      return res.status(400).json({ error: 'Only demo applicant sandboxes can be reset' });
    }
    await archiveApplicationForUser(userId);
    res.json({ success: true, message: 'Sandbox reset successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reset demo application' });
  }
});

/**
 * Seed sample demo applications for staff list
 */
app.post('/api/staff/seed-demo', requireStaff, async (req: Request, res: Response) => {
  try {
    const count = await seedDemoApplications();
    res.json({ success: true, seededCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to seed demo data' });
  }
});

/**
 * Auth & Role synchronization
 */
app.post('/api/auth/sync-role', async (req: Request, res: Response) => {
  try {
    const { uid, email, displayName } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email are required' });
    }
    const result = await syncUserRole(uid, email, displayName);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to sync user role' });
  }
});

/**
 * Grant staff access to an account (Restricted to non-demo users)
 */
app.post('/api/staff/grant-access', async (req: Request, res: Response) => {
  try {
    const reqEmail = (req.headers['x-user-email'] as string) || '';
    const reqUid = (req.headers['x-user-id'] as string) || '';
    if (isDemoStaff(reqEmail, reqUid) || reqUid.startsWith('demo-')) {
      return res.status(403).json({ error: 'Demo users cannot modify roles or settings' });
    }

    const { email, uid } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = await grantStaffRole(email, uid);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to grant staff access' });
  }
});

/**
 * List authorized staff emails (Restricted to real staff)
 */
app.get('/api/staff/list', (req: Request, res: Response) => {
  try {
    const reqEmail = (req.headers['x-user-email'] as string) || '';
    const reqUid = (req.headers['x-user-id'] as string) || '';
    if (isDemoStaff(reqEmail, reqUid) || reqUid.startsWith('demo-')) {
      return res.status(403).json({ error: 'Demo users cannot view staff user lists' });
    }

    const staff = getStaffEmails();
    res.json({ staff });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to retrieve staff list' });
  }
});

/**
 * Save applicant draft details
 */
app.post('/api/applications/draft', async (req: Request, res: Response) => {
  try {
    const { userId, applicantEmail, applicantName, phone, dateOfBirth, course, marksPercentage, annualFamilyIncome, step, documents } = req.body;
    if (!userId || !applicantEmail) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }

    const isDemo = userId.startsWith('demo-applicant-') || req.body.isDemo === true;
    let existing = await getApplicationByUserId(userId);
    const now = new Date().toISOString();

    if (!existing) {
      const newId = generateApplicationId();
      existing = {
        id: newId,
        userId,
        applicantEmail,
        applicantName: applicantName || '',
        phone: phone || '',
        dateOfBirth: dateOfBirth || '',
        course: course || '',
        marksPercentage: Number(marksPercentage) || 0,
        annualFamilyIncome: Number(annualFamilyIncome) || 0,
        status: 'Draft',
        isDraft: true,
        step: step || 1,
        documents: documents || {},
        isDemo: isDemo ? true : undefined,
        createdAt: now,
        updatedAt: now
      };
    } else {
      // If already submitted, don't revert to draft
      if (!existing.isDraft && existing.status !== 'Draft') {
        return res.json({ success: true, application: existing });
      }
      existing = {
        ...existing,
        applicantName: applicantName !== undefined ? applicantName : existing.applicantName,
        phone: phone !== undefined ? phone : existing.phone,
        dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : existing.dateOfBirth,
        course: course !== undefined ? course : existing.course,
        marksPercentage: marksPercentage !== undefined ? Number(marksPercentage) : existing.marksPercentage,
        annualFamilyIncome: annualFamilyIncome !== undefined ? Number(annualFamilyIncome) : existing.annualFamilyIncome,
        step: step !== undefined ? step : existing.step,
        documents: documents ? { ...existing.documents, ...documents } : existing.documents,
        isDemo: isDemo || existing.isDemo || undefined,
        updatedAt: now
      };
    }

    const saved = await saveApplication(existing);
    res.json({ success: true, application: saved });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save draft' });
  }
});

/**
 * Get current application and notifications for logged-in applicant
 */
app.get('/api/applications/my', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const application = await getApplicationByUserId(userId);
    const notifications = await getNotificationsByUserId(userId);
    res.json({ application, notifications });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to retrieve application' });
  }
});

/**
 * Mark notification as read
 */
app.post('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await markNotificationAsRead(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to mark notification read' });
  }
});

/**
 * Validate and process uploaded document files
 */
function validateAndBufferFile(docMeta: UploadedDocMetadata): { buffer: Buffer; mimeType: string } {
  if (!docMeta.dataUrl) {
    throw new Error(`File data missing for ${docMeta.slot}`);
  }
  const base64Data = docMeta.dataUrl.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File ${docMeta.fileName} is larger than 5 MB. Upload a smaller file.`);
  }

  const detectedMime = detectRealMimeType(buffer);
  if (!detectedMime) {
    throw new Error(`Only PDF, JPG, or PNG files are accepted. File ${docMeta.fileName} has an unsupported format.`);
  }

  return { buffer, mimeType: detectedMime };
}

/**
 * Submit & evaluate application
 */
app.post('/api/applications/evaluate', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      applicantEmail,
      applicantName,
      phone,
      dateOfBirth,
      course,
      marksPercentage,
      annualFamilyIncome,
      documents
    } = req.body;

    // Validate form inputs
    const dobParts = (dateOfBirth || '').split('-');
    const [y, m, d] = dobParts.length === 3 ? dobParts : ['', '', ''];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = m ? months[parseInt(m, 10) - 1] : '';

    const validation = validateDetailsForm({
      applicantName,
      email: applicantEmail,
      phone,
      dobDay: d ? String(parseInt(d, 10)) : '',
      dobMonth: monthName,
      dobYear: y,
      course,
      marksPercentage,
      annualFamilyIncome
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return res.status(400).json({ error: firstError });
    }

    // Verify all 3 document slots are present
    const slots: DocumentSlot[] = ['id_proof', 'marksheet', 'income_certificate'];
    for (const slot of slots) {
      if (!documents || !documents[slot]) {
        return res.status(400).json({ error: `Please upload your ${slot.replace('_', ' ')}.` });
      }
    }

    // Validate file sizes and real magic bytes
    const processedDocs: Record<DocumentSlot, UploadedDocMetadata> = {} as any;
    for (const slot of slots) {
      const doc = documents[slot];
      const { mimeType } = validateAndBufferFile(doc);
      processedDocs[slot] = {
        ...doc,
        fileType: mimeType
      };
    }

    // Read each document with Gemini Flash server-side
    let hasQuotaError = false;
    for (const slot of slots) {
      const doc = processedDocs[slot];
      const geminiResult = await analyzeDocumentWithGemini(doc.dataUrl!, doc.fileType);

      doc.detectedType = geminiResult.document_type;
      doc.isReadable = geminiResult.is_readable;
      doc.readabilityIssue = geminiResult.readability_issue;
      doc.confidence = geminiResult.confidence;
      doc.extractedFields = geminiResult.fields;
      if (geminiResult.raw_error === 'quota_exceeded') {
        hasQuotaError = true;
      }
    }

    // Evaluate application using plain code comparison
    const evalResult = evaluateApplication(
      {
        applicantName,
        dateOfBirth,
        course,
        marksPercentage: Number(marksPercentage),
        annualFamilyIncome: Number(annualFamilyIncome)
      },
      processedDocs
    );

    // If Gemini quota or rate limit is hit, do not crash and do not reject
    if (hasQuotaError) {
      evalResult.status = 'Needs review';
      evalResult.summary = 'We could not check your documents right now. A staff member will review them.';
      evalResult.problems = [];
    }

    const now = new Date().toISOString();
    let existing = await getApplicationByUserId(userId);
    const appId = existing?.id || generateApplicationId();
    const isDemo = userId.startsWith('demo-applicant-') || Boolean(req.body.isDemo) || Boolean(existing?.isDemo);

    const application: ApplicationRecord = {
      id: appId,
      userId,
      applicantEmail,
      applicantName,
      phone,
      dateOfBirth,
      course,
      marksPercentage: Number(marksPercentage),
      annualFamilyIncome: Number(annualFamilyIncome),
      status: evalResult.status,
      isDraft: false,
      isDemo,
      documents: processedDocs,
      comparisons: evalResult.comparisons,
      problems: evalResult.problems,
      summary: evalResult.summary,
      statusHistory: [
        ...(existing?.statusHistory || []),
        {
          status: evalResult.status,
          changedBy: 'system',
          timestamp: now,
          reason: evalResult.summary
        }
      ],
      submittedAt: existing?.submittedAt || now,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const savedApp = await saveApplication(application);

    // Notifications: When status is Needs correction, Approved, Rejected, or Needs review
    if (['Needs correction', 'Approved', 'Rejected', 'Needs review'].includes(evalResult.status)) {
      const { subject, message, text, html } = buildNotificationContent(savedApp, evalResult.problems);

      if (isDemo) {
        // Demo users never trigger real emails. For them, save the notification in-app only and mark it "Demo: email not sent".
        const notif: NotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          applicationId: savedApp.id,
          recipientEmail: applicantEmail,
          type: evalResult.status === 'Needs correction' ? 'needs_correction' : 'status_update',
          title: subject,
          message: `${message} (Demo: email not sent)`,
          problems: evalResult.problems,
          emailStatus: 'sent',
          emailError: 'Demo: email not sent',
          isDemo: true,
          createdAt: now,
          read: false
        };
        await saveNotification(notif);
      } else {
        const emailResult = await sendEmailNotification(applicantEmail, subject, html, text);
        const notif: NotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          applicationId: savedApp.id,
          recipientEmail: applicantEmail,
          type: evalResult.status === 'Needs correction' ? 'needs_correction' : 'status_update',
          title: subject,
          message,
          problems: evalResult.problems,
          emailStatus: emailResult.emailStatus,
          emailError: emailResult.emailError,
          createdAt: now,
          read: false
        };
        await saveNotification(notif);
      }
    }

    res.json({ success: true, application: savedApp });
  } catch (err: any) {
    console.error('Evaluation error:', err);
    res.status(500).json({ error: err?.message || 'Evaluation failed. Please try again.' });
  }
});

/**
 * Resubmit application after fixing issues
 */
app.post('/api/applications/:id/resubmit', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const existing = await getApplicationById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const {
      applicantName,
      dateOfBirth,
      marksPercentage,
      annualFamilyIncome,
      replacementDocuments
    } = req.body;

    const updatedFormData = {
      applicantName: applicantName !== undefined ? applicantName : existing.applicantName,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : existing.dateOfBirth,
      course: existing.course,
      marksPercentage: marksPercentage !== undefined ? Number(marksPercentage) : existing.marksPercentage,
      annualFamilyIncome: annualFamilyIncome !== undefined ? Number(annualFamilyIncome) : existing.annualFamilyIncome
    };

    const updatedDocs: Record<DocumentSlot, UploadedDocMetadata> = { ...existing.documents } as any;

    // Only re-read documents that were replaced
    if (replacementDocuments && typeof replacementDocuments === 'object') {
      for (const slotKey of Object.keys(replacementDocuments) as DocumentSlot[]) {
        const doc = replacementDocuments[slotKey];
        if (doc && doc.dataUrl) {
          const { mimeType } = validateAndBufferFile(doc);
          const geminiResult = await analyzeDocumentWithGemini(doc.dataUrl, mimeType);

          updatedDocs[slotKey] = {
            ...doc,
            fileType: mimeType,
            detectedType: geminiResult.document_type,
            isReadable: geminiResult.is_readable,
            readabilityIssue: geminiResult.readability_issue,
            confidence: geminiResult.confidence,
            extractedFields: geminiResult.fields,
            uploadedAt: new Date().toISOString()
          };
        }
      }
    }

    // Re-run evaluation
    const evalResult = evaluateApplication(updatedFormData, updatedDocs);
    const now = new Date().toISOString();

    const updatedApplication: ApplicationRecord = {
      ...existing,
      applicantName: updatedFormData.applicantName,
      dateOfBirth: updatedFormData.dateOfBirth,
      marksPercentage: updatedFormData.marksPercentage,
      annualFamilyIncome: updatedFormData.annualFamilyIncome,
      documents: updatedDocs,
      status: evalResult.status,
      comparisons: evalResult.comparisons,
      problems: evalResult.problems,
      summary: evalResult.summary,
      statusHistory: [
        ...(existing.statusHistory || []),
        {
          status: evalResult.status,
          changedBy: 'applicant (resubmission)',
          timestamp: now,
          reason: 'Applicant resubmitted with corrected values or replacement documents'
        }
      ],
      updatedAt: now
    };

    const saved = await saveApplication(updatedApplication);

    // Send notification
    if (['Needs correction', 'Approved', 'Rejected', 'Needs review'].includes(evalResult.status)) {
      const { subject, message, text, html } = buildNotificationContent(saved, evalResult.problems);

      if (saved.isDemo) {
        const notif: NotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: saved.userId,
          applicationId: saved.id,
          recipientEmail: saved.applicantEmail,
          type: evalResult.status === 'Needs correction' ? 'needs_correction' : 'status_update',
          title: subject,
          message: `${message} (Demo: email not sent)`,
          problems: evalResult.problems,
          emailStatus: 'sent',
          emailError: 'Demo: email not sent',
          isDemo: true,
          createdAt: now,
          read: false
        };
        await saveNotification(notif);
      } else {
        const emailResult = await sendEmailNotification(saved.applicantEmail, subject, html, text);
        const notif: NotificationRecord = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: saved.userId,
          applicationId: saved.id,
          recipientEmail: saved.applicantEmail,
          type: evalResult.status === 'Needs correction' ? 'needs_correction' : 'status_update',
          title: subject,
          message,
          problems: evalResult.problems,
          emailStatus: emailResult.emailStatus,
          emailError: emailResult.emailError,
          createdAt: now,
          read: false
        };
        await saveNotification(notif);
      }
    }

    res.json({ success: true, application: saved });
  } catch (err: any) {
    console.error('Resubmission error:', err);
    res.status(500).json({ error: err?.message || 'Failed to resubmit application' });
  }
});

/**
 * Staff list of applications with live counts, search, and pagination
 */
app.get('/api/staff/applications', requireStaff, async (req: Request, res: Response) => {
  try {
    const reqEmail = (req.headers['x-user-email'] as string) || '';
    const reqUid = (req.headers['x-user-id'] as string) || '';
    const isDemo = isDemoStaff(reqEmail, reqUid);

    const all = await getAllApplications();
    // Exclude incomplete drafts from staff list
    let submittedOnly = all.filter(a => !a.isDraft);

    // Isolation: Demo staff can only see demo applications
    if (isDemo) {
      submittedOnly = submittedOnly.filter(a => a.isDemo === true);
    }

    // Calculate live counts for each tab
    const counts = {
      all: submittedOnly.length,
      needs_review: submittedOnly.filter(a => a.status === 'Needs review').length,
      needs_correction: submittedOnly.filter(a => a.status === 'Needs correction').length,
      approved: submittedOnly.filter(a => a.status === 'Approved').length,
      rejected: submittedOnly.filter(a => a.status === 'Rejected').length
    };

    const tab = (req.query.tab as string) || 'all';
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = 10;

    let filtered = [...submittedOnly];

    // Filter by tab
    if (tab === 'needs_review') {
      filtered = filtered.filter(a => a.status === 'Needs review');
    } else if (tab === 'needs_correction') {
      filtered = filtered.filter(a => a.status === 'Needs correction');
    } else if (tab === 'approved') {
      filtered = filtered.filter(a => a.status === 'Approved');
    } else if (tab === 'rejected') {
      filtered = filtered.filter(a => a.status === 'Rejected');
    }

    // Filter by search query
    if (search) {
      filtered = filtered.filter(a => {
        const nameMatch = a.applicantName.toLowerCase().includes(search);
        const idMatch = a.id.toLowerCase().includes(search);
        const courseMatch = a.course.toLowerCase().includes(search);
        const statusMatch = a.status.toLowerCase().includes(search);

        // Check document filenames and types
        const docs = Object.values(a.documents || {});
        const docFileMatch = docs.some(d => d?.fileName?.toLowerCase().includes(search));
        const docTypeMatch = docs.some(d => d?.detectedType?.toLowerCase().includes(search));

        // Check extracted values (date, income, marks)
        const dateMatch = a.dateOfBirth?.toLowerCase().includes(search) || formatDateDisplay(a.dateOfBirth).toLowerCase().includes(search);
        const incomeMatch = String(a.annualFamilyIncome).includes(search);
        const marksMatch = String(a.marksPercentage).includes(search);

        return (
          nameMatch ||
          idMatch ||
          courseMatch ||
          statusMatch ||
          docFileMatch ||
          docTypeMatch ||
          dateMatch ||
          incomeMatch ||
          marksMatch
        );
      });
    }

    // Sort by submittedAt / updatedAt descending
    filtered.sort((a, b) => new Date(b.submittedAt || b.updatedAt).getTime() - new Date(a.submittedAt || a.updatedAt).getTime());

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    res.json({
      applications: paginated,
      counts,
      total,
      page,
      totalPages
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list applications' });
  }
});

/**
 * Staff view application detail
 */
app.get('/api/staff/applications/:id', requireStaff, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const reqEmail = (req.headers['x-user-email'] as string) || '';
    const reqUid = (req.headers['x-user-id'] as string) || '';
    const application = await getApplicationById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    // Isolation: Demo staff cannot view real applicant records
    if (isDemoStaff(reqEmail, reqUid) && !application.isDemo) {
      return res.status(403).json({ error: 'Demo staff cannot access real applicant records' });
    }
    res.json({ application });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get application' });
  }
});

/**
 * Staff decision action: Approve, Request correction, Reject
 */
app.post('/api/staff/applications/:id/action', requireStaff, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const staffEmail = (req.headers['x-user-email'] as string) || 'staff';
    const staffUid = (req.headers['x-user-id'] as string) || '';
    const { action, note } = req.body;

    const application = await getApplicationById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Isolation: Demo staff cannot modify real applicant records
    if (isDemoStaff(staffEmail, staffUid) && !application.isDemo) {
      return res.status(403).json({ error: 'Demo staff cannot modify real applicant records' });
    }

    let newStatus: ApplicationStatus;
    let actionReason: string;

    if (action === 'approve') {
      newStatus = 'Approved';
      actionReason = note || 'Approved by staff review';
    } else if (action === 'request_correction') {
      if (!note || !note.trim()) {
        return res.status(400).json({ error: 'Note to applicant is required when requesting a correction.' });
      }
      newStatus = 'Needs correction';
      actionReason = note.trim();
    } else if (action === 'reject') {
      newStatus = 'Rejected';
      actionReason = note ? note.trim() : 'Application does not meet scholarship requirements';
    } else {
      return res.status(400).json({ error: 'Invalid staff action' });
    }

    const now = new Date().toISOString();
    const updated: ApplicationRecord = {
      ...application,
      status: newStatus,
      staffNote: note ? note.trim() : undefined,
      statusHistory: [
        ...(application.statusHistory || []),
        {
          status: newStatus,
          changedBy: staffEmail,
          timestamp: now,
          note: note ? note.trim() : undefined,
          reason: actionReason
        }
      ],
      updatedAt: now
    };

    const saved = await saveApplication(updated);

    // Send notification and email
    const { subject, message, text, html } = buildNotificationContent(saved, saved.problems, note);

    if (saved.isDemo) {
      const notif: NotificationRecord = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: saved.userId,
        applicationId: saved.id,
        recipientEmail: saved.applicantEmail,
        type: newStatus === 'Needs correction' ? 'needs_correction' : 'status_update',
        title: subject,
        message: `${message} (Demo: email not sent)`,
        problems: saved.problems,
        emailStatus: 'sent',
        emailError: 'Demo: email not sent',
        isDemo: true,
        createdAt: now,
        read: false
      };
      await saveNotification(notif);
    } else {
      const emailResult = await sendEmailNotification(saved.applicantEmail, subject, html, text);
      const notif: NotificationRecord = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: saved.userId,
        applicationId: saved.id,
        recipientEmail: saved.applicantEmail,
        type: newStatus === 'Needs correction' ? 'needs_correction' : 'status_update',
        title: subject,
        message,
        problems: saved.problems,
        emailStatus: emailResult.emailStatus,
        emailError: emailResult.emailError,
        createdAt: now,
        read: false
      };
      await saveNotification(notif);
    }

    res.json({ success: true, application: saved });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to execute staff action' });
  }
});

/**
 * One-time demo seed script clearly marked isDemo: true
 */
app.post('/api/seed-demo', requireStaff, async (req: Request, res: Response) => {
  try {
    const demoApps: ApplicationRecord[] = [
      {
        id: 'SCH-2025-084',
        userId: 'demo_user_pooja',
        applicantEmail: 'pooja.sharma@example.com',
        applicantName: 'Pooja Ramesh Sharma',
        phone: '+91 98201 44521',
        dateOfBirth: '2003-05-12',
        course: 'B.Tech Computer Science and Engineering',
        marksPercentage: 84.5,
        annualFamilyIncome: 240000,
        status: 'Needs correction',
        isDraft: false,
        isDemo: true,
        submittedAt: '2025-05-14T09:30:00Z',
        createdAt: '2025-05-14T09:00:00Z',
        updatedAt: '2025-05-14T09:30:00Z',
        summary: 'The date of birth entered on the form does not match the ID document. The income certificate scan is also too faint to read the official stamp.',
        documents: {
          id_proof: {
            slot: 'id_proof',
            fileName: 'aadhaar_front_back.pdf',
            fileSize: 1887436,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-14T09:15:00Z',
            detectedType: 'id_proof',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.95,
            extractedFields: {
              full_name: 'Pooja R. Sharma',
              date_of_birth: '2003-05-21',
              id_number_last4: '4521',
              marks_percentage: null,
              issuer_or_board: 'GOVT OF INDIA',
              annual_income: null
            }
          },
          marksheet: {
            slot: 'marksheet',
            fileName: 'marksheet_class12.pdf',
            fileSize: 2306867,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-14T09:18:00Z',
            detectedType: 'marksheet',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.98,
            extractedFields: {
              full_name: 'Pooja Ramesh Sharma',
              date_of_birth: null,
              id_number_last4: null,
              marks_percentage: 84.5,
              issuer_or_board: 'STATE BOARD',
              annual_income: null
            }
          },
          income_certificate: {
            slot: 'income_certificate',
            fileName: 'income_certificate_tahsildar.pdf',
            fileSize: 1468006,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-14T09:20:00Z',
            detectedType: 'income_certificate',
            isReadable: false,
            readabilityIssue: 'stamp_unreadable',
            confidence: 0.72,
            extractedFields: {
              full_name: 'Pooja Ramesh Sharma',
              date_of_birth: null,
              id_number_last4: null,
              marks_percentage: null,
              issuer_or_board: 'TAHSILDAR OFFICE',
              annual_income: 240000
            }
          }
        },
        comparisons: [
          { field: 'applicantName', label: 'Full name', entered: 'Pooja Ramesh Sharma', found: 'Pooja R. Sharma', result: 'match' },
          { field: 'dateOfBirth', label: 'Date of birth', entered: '12 May 2003', found: '21 May 2003', result: 'mismatch' },
          { field: 'course', label: 'Course', entered: 'B.Tech Computer Science and Engineering', found: 'B.Tech CSE (STATE BOARD)', result: 'match' },
          { field: 'marksPercentage', label: 'Marks percentage', entered: '84.5%', found: '84.5%', result: 'match' },
          { field: 'annualFamilyIncome', label: 'Annual family income', entered: '₹2,40,000', found: '₹2,40,000', result: 'match' }
        ],
        problems: [
          {
            id: 'dob_mismatch',
            title: 'Date of birth does not match',
            field: 'dateOfBirth',
            entered: '12 May 2003',
            found: '21 May 2003',
            fixNeeded: 'Confirm your birth date or upload a clearer ID.',
            slot: 'id_proof'
          },
          {
            id: 'unreadable_income_certificate',
            title: 'Income certificate is unreadable',
            field: 'income_certificate',
            entered: 'income_certificate_tahsildar.pdf',
            found: 'Official stamp is faint and unreadable',
            fixNeeded: 'Upload a clearer photo or scan of your income certificate.',
            slot: 'income_certificate'
          }
        ],
        statusHistory: [
          { status: 'Needs correction', changedBy: 'system', timestamp: '2025-05-14T09:30:00Z', reason: 'Automated document comparison found 2 problems.' }
        ]
      },
      {
        id: 'SCH-2025-083',
        userId: 'demo_user_tariq',
        applicantEmail: 'tariq.khan@example.com',
        applicantName: 'Tariq Ahmad Khan',
        phone: '+91 97112 33412',
        dateOfBirth: '2002-08-19',
        course: 'M.Sc Applied Physics',
        marksPercentage: 88.0,
        annualFamilyIncome: 180000,
        status: 'Needs review',
        isDraft: false,
        isDemo: true,
        submittedAt: '2025-05-14T08:10:00Z',
        createdAt: '2025-05-14T07:45:00Z',
        updatedAt: '2025-05-14T08:10:00Z',
        summary: 'Income certificate text is blurry. Scan quality requires manual verification by staff.',
        documents: {
          id_proof: {
            slot: 'id_proof',
            fileName: 'pan_card.jpg',
            fileSize: 1200000,
            fileType: 'image/jpeg',
            uploadedAt: '2025-05-14T08:00:00Z',
            detectedType: 'id_proof',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.92,
            extractedFields: { full_name: 'Tariq Ahmad Khan', date_of_birth: '2002-08-19', id_number_last4: '8812', marks_percentage: null, issuer_or_board: 'INCOME TAX DEPT', annual_income: null }
          },
          marksheet: {
            slot: 'marksheet',
            fileName: 'bsc_final_transcript.pdf',
            fileSize: 2100000,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-14T08:05:00Z',
            detectedType: 'marksheet',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.91,
            extractedFields: { full_name: 'Tariq A. Khan', date_of_birth: null, id_number_last4: null, marks_percentage: 88.0, issuer_or_board: 'DELHI UNIVERSITY', annual_income: null }
          },
          income_certificate: {
            slot: 'income_certificate',
            fileName: 'income_slip.jpg',
            fileSize: 950000,
            fileType: 'image/jpeg',
            uploadedAt: '2025-05-14T08:08:00Z',
            detectedType: 'income_certificate',
            isReadable: true,
            readabilityIssue: 'blurry',
            confidence: 0.65,
            extractedFields: { full_name: 'Tariq Ahmad Khan', date_of_birth: null, id_number_last4: null, marks_percentage: null, issuer_or_board: 'REVENUE DEPT', annual_income: 180000 }
          }
        },
        comparisons: [
          { field: 'applicantName', label: 'Full name', entered: 'Tariq Ahmad Khan', found: 'Tariq A. Khan', result: 'match' },
          { field: 'dateOfBirth', label: 'Date of birth', entered: '19 Aug 2002', found: '19 Aug 2002', result: 'match' },
          { field: 'course', label: 'Course', entered: 'M.Sc Applied Physics', found: 'M.Sc Applied Physics (DELHI UNIVERSITY)', result: 'match' },
          { field: 'marksPercentage', label: 'Marks percentage', entered: '88%', found: '88%', result: 'match' },
          { field: 'annualFamilyIncome', label: 'Annual family income', entered: '₹1,80,000', found: '₹1,80,000', result: 'match' }
        ],
        problems: [],
        statusHistory: [
          { status: 'Needs review', changedBy: 'system', timestamp: '2025-05-14T08:10:00Z', reason: 'Document confidence 0.65 below 0.7 threshold' }
        ]
      },
      {
        id: 'SCH-2025-082',
        userId: 'demo_user_ananya',
        applicantEmail: 'ananya.das@example.com',
        applicantName: 'Ananya Priya Das',
        phone: '+91 98451 22910',
        dateOfBirth: '2004-11-03',
        course: 'B.A. Economics (Hons)',
        marksPercentage: 92.4,
        annualFamilyIncome: 320000,
        status: 'Approved',
        isDraft: false,
        isDemo: true,
        submittedAt: '2025-05-13T14:20:00Z',
        createdAt: '2025-05-13T14:00:00Z',
        updatedAt: '2025-05-13T14:20:00Z',
        summary: 'All details match your documents. Your application has been approved.',
        documents: {
          id_proof: {
            slot: 'id_proof',
            fileName: 'passport_scan.pdf',
            fileSize: 1540000,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-13T14:05:00Z',
            detectedType: 'id_proof',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.99,
            extractedFields: { full_name: 'Ananya Priya Das', date_of_birth: '2004-11-03', id_number_last4: '7102', marks_percentage: null, issuer_or_board: 'REPUBLIC OF INDIA', annual_income: null }
          },
          marksheet: {
            slot: 'marksheet',
            fileName: 'class12_cbse.pdf',
            fileSize: 1980000,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-13T14:10:00Z',
            detectedType: 'marksheet',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.97,
            extractedFields: { full_name: 'Ananya Priya Das', date_of_birth: null, id_number_last4: null, marks_percentage: 92.4, issuer_or_board: 'CBSE', annual_income: null }
          },
          income_certificate: {
            slot: 'income_certificate',
            fileName: 'revenue_certificate.pdf',
            fileSize: 1650000,
            fileType: 'application/pdf',
            uploadedAt: '2025-05-13T14:15:00Z',
            detectedType: 'income_certificate',
            isReadable: true,
            readabilityIssue: null,
            confidence: 0.95,
            extractedFields: { full_name: 'Ananya Priya Das', date_of_birth: null, id_number_last4: null, marks_percentage: null, issuer_or_board: 'DISTRICT MAGISTRATE', annual_income: 320000 }
          }
        },
        comparisons: [
          { field: 'applicantName', label: 'Full name', entered: 'Ananya Priya Das', found: 'Ananya Priya Das', result: 'match' },
          { field: 'dateOfBirth', label: 'Date of birth', entered: '3 Nov 2004', found: '3 Nov 2004', result: 'match' },
          { field: 'course', label: 'Course', entered: 'B.A. Economics (Hons)', found: 'B.A. Economics (Hons) (CBSE)', result: 'match' },
          { field: 'marksPercentage', label: 'Marks percentage', entered: '92.4%', found: '92.4%', result: 'match' },
          { field: 'annualFamilyIncome', label: 'Annual family income', entered: '₹3,20,000', found: '₹3,20,000', result: 'match' }
        ],
        problems: [],
        statusHistory: [
          { status: 'Approved', changedBy: 'system', timestamp: '2025-05-13T14:20:00Z', reason: 'All 3 documents match. Automated approval.' }
        ]
      }
    ];

    for (const appItem of demoApps) {
      await saveApplication(appItem);
    }

    res.json({ success: true, count: demoApps.length, message: 'Demo applications seeded successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to seed demo data' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist'))) {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: 3000, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ApplyFlow server running on http://0.0.0.0:${port}`);
  });
}

startServer();
