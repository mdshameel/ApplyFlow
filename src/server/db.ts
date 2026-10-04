import fs from 'fs';
import path from 'path';
import { ApplicationRecord, NotificationRecord, UserRecord, Role } from '../lib/types';
import firebaseConfig from '../../firebase-applet-config.json';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface StoreSchema {
  applications: Record<string, ApplicationRecord>;
  notifications: Record<string, NotificationRecord>;
  users: Record<string, UserRecord>;
  admins: Record<string, { id: string; email: string; createdAt: string }>;
}

let memoryStore: StoreSchema = {
  applications: {},
  notifications: {},
  users: {},
  admins: {}
};

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryStore = JSON.parse(content);
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize local data store:', err);
  }
}

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

ensureDataFile();

// Firestore REST sync helper for background synchronization
const FIRESTORE_PROJECT_ID = firebaseConfig.projectId;
const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

/**
 * Staff emails check
 */
export function getStaffEmails(): string[] {
  const envStaff = process.env.STAFF_EMAILS || '';
  const list = envStaff.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  // Default include the project owner and testing emails
  const defaultEmails = ['mdshameel740@gmail.com', 'systemkali741@gmail.com'];
  for (const d of defaultEmails) {
    if (!list.includes(d)) {
      list.push(d);
    }
  }

  // Also include any admins saved in the store
  if (memoryStore && memoryStore.admins) {
    for (const adm of Object.values(memoryStore.admins)) {
      if (adm?.email && !list.includes(adm.email.trim().toLowerCase())) {
        list.push(adm.email.trim().toLowerCase());
      }
    }
  }

  return list;
}

export function isStaffEmail(email?: string | null): boolean {
  if (!email) return false;
  if (email.trim().toLowerCase() === 'demo-staff@scholarship.example.org') {
    return true;
  }
  const staff = getStaffEmails();
  return staff.includes(email.trim().toLowerCase());
}

export function isDemoStaff(email?: string | null, uid?: string | null): boolean {
  if (uid === 'demo-staff') return true;
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === 'demo-staff@scholarship.example.org' || clean === 'demo-staff';
}

export function isRealStaffEmail(email?: string | null): boolean {
  if (!email || isDemoStaff(email)) return false;
  return isStaffEmail(email);
}

/**
 * Seed sample demo applications for the staff review dashboard
 * Idempotent: will not duplicate if already seeded
 */
export async function seedDemoApplications(): Promise<number> {
  const sampleApps: ApplicationRecord[] = [
    {
      id: 'SCH-DEMO-001',
      userId: 'demo-applicant-sample1',
      applicantEmail: 'rohan.mehta.demo@scholarship.example.org',
      applicantName: 'Rohan Mehta',
      phone: '+91 98201 44521',
      dateOfBirth: '2004-08-14',
      course: 'B.Tech Mechanical Engineering',
      marksPercentage: 85,
      annualFamilyIncome: 180000,
      status: 'Needs review',
      isDraft: false,
      isDemo: true,
      documents: {
        id_proof: {
          slot: 'id_proof',
          fileName: 'sample_id_clean.pdf',
          fileSize: 1845,
          fileType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          isReadable: true,
          confidence: 0.98,
          detectedType: 'id_proof',
          extractedFields: {
            full_name: 'Rohan Mehta',
            date_of_birth: '2004-08-14',
            id_number_last4: '0000',
            marks_percentage: null,
            issuer_or_board: 'State Collegiate Council',
            annual_income: null
          }
        },
        marksheet: {
          slot: 'marksheet',
          fileName: 'sample_marksheet_clean.pdf',
          fileSize: 2750,
          fileType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          isReadable: true,
          confidence: 0.96,
          detectedType: 'marksheet',
          extractedFields: {
            full_name: 'Rohan Mehta',
            date_of_birth: '2004-08-14',
            id_number_last4: null,
            marks_percentage: 85,
            issuer_or_board: 'State Higher Secondary Board',
            annual_income: null
          }
        },
        income_certificate: {
          slot: 'income_certificate',
          fileName: 'sample_income_clean.pdf',
          fileSize: 2210,
          fileType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          isReadable: true,
          confidence: 0.95,
          detectedType: 'income_certificate',
          extractedFields: {
            full_name: 'Rohan Mehta',
            date_of_birth: null,
            id_number_last4: null,
            marks_percentage: null,
            issuer_or_board: 'Tahsildar Office',
            annual_income: 180000
          }
        }
      },
      summary: 'All required documents submitted. Pending staff award committee sign-off.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'SCH-DEMO-002',
      userId: 'demo-applicant-sample2',
      applicantEmail: 'ananya.iyer.demo@scholarship.example.org',
      applicantName: 'Ananya Iyer',
      phone: '+91 97412 88301',
      dateOfBirth: '2004-03-22',
      course: 'B.Sc Mathematics',
      marksPercentage: 92,
      annualFamilyIncome: 140000,
      status: 'Needs correction',
      isDraft: false,
      isDemo: true,
      documents: {
        id_proof: {
          slot: 'id_proof',
          fileName: 'sample_id_wrong_dob.pdf',
          fileSize: 1845,
          fileType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          isReadable: true,
          confidence: 0.98,
          detectedType: 'id_proof',
          extractedFields: {
            full_name: 'Ananya Iyer',
            date_of_birth: '2002-11-20',
            id_number_last4: '0000',
            marks_percentage: null,
            issuer_or_board: null,
            annual_income: null
          }
        }
      },
      problems: [
        {
          id: 'dob_mismatch_demo',
          title: 'Date of birth mismatch',
          field: 'dateOfBirth',
          entered: '22 Mar 2004',
          found: '20 Nov 2002',
          fixNeeded: 'Upload a government photo ID confirming birth date 22 Mar 2004.',
          slot: 'id_proof'
        }
      ],
      summary: 'Date of birth on ID card (20 Nov 2002) differs from application form (22 Mar 2004).',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'SCH-DEMO-003',
      userId: 'demo-applicant-sample3',
      applicantEmail: 'kabir.patel.demo@scholarship.example.org',
      applicantName: 'Kabir Patel',
      phone: '+91 98450 11223',
      dateOfBirth: '2003-11-09',
      course: 'B.Tech Computer Science and Engineering',
      marksPercentage: 95,
      annualFamilyIncome: 95000,
      status: 'Approved',
      isDraft: false,
      isDemo: true,
      documents: {},
      summary: 'Application verified and approved for merit scholarship disbursement.',
      staffNote: 'Top percentile candidate with validated low-income certificate. Approved.',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 10).toISOString()
    },
    {
      id: 'SCH-DEMO-004',
      userId: 'demo-applicant-sample4',
      applicantEmail: 'pooja.verma.demo@scholarship.example.org',
      applicantName: 'Pooja Verma',
      phone: '+91 91234 56789',
      dateOfBirth: '2003-05-18',
      course: 'B.Com (Hons)',
      marksPercentage: 54,
      annualFamilyIncome: 850000,
      status: 'Rejected',
      isDraft: false,
      isDemo: true,
      documents: {},
      summary: 'Application rejected: Family income exceeds scholarship threshold and marks below cutoff.',
      staffNote: 'Annual family income Rs. 8,50,000 exceeds threshold limit of Rs. 4,00,000.',
      createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
    }
  ];

  let addedCount = 0;
  for (const app of sampleApps) {
    if (!memoryStore.applications[app.id]) {
      memoryStore.applications[app.id] = app;
      addedCount++;
    }
  }

  if (addedCount > 0) {
    persistStore();
  }
  return addedCount;
}

/**
 * Archive the current active application for a user (allowing demo applicants to restart)
 */
export async function archiveApplicationForUser(userId: string): Promise<boolean> {
  const apps = Object.values(memoryStore.applications).filter(a => a.userId === userId);
  if (!apps.length) return false;

  for (const app of apps) {
    // Delete or mark archived so the applicant starts fresh
    delete memoryStore.applications[app.id];
  }

  // Also remove notifications
  const notifs = Object.values(memoryStore.notifications).filter(n => n.userId === userId);
  for (const n of notifs) {
    delete memoryStore.notifications[n.id];
  }

  persistStore();
  return true;
}

/**
 * Delete demo applicant users and their data older than 7 days
 */
export async function cleanupOldDemoData(maxAgeDays = 7): Promise<number> {
  const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let removedCount = 0;

  // Cleanup demo applications
  for (const [id, app] of Object.entries(memoryStore.applications)) {
    if (app.isDemo && (app.userId.startsWith('demo-applicant-') || app.id.startsWith('SCH-DEMO-'))) {
      const created = new Date(app.createdAt).getTime();
      if (!isNaN(created) && created < cutoffTime) {
        delete memoryStore.applications[id];
        removedCount++;
      }
    }
  }

  // Cleanup demo notifications
  for (const [id, notif] of Object.entries(memoryStore.notifications)) {
    if (notif.isDemo || notif.userId.startsWith('demo-applicant-')) {
      const created = new Date(notif.createdAt).getTime();
      if (!isNaN(created) && created < cutoffTime) {
        delete memoryStore.notifications[id];
      }
    }
  }

  // Cleanup demo users (except fixed demo-staff)
  for (const [uid, u] of Object.entries(memoryStore.users)) {
    if (u.isDemo && uid.startsWith('demo-applicant-')) {
      const created = new Date(u.createdAt).getTime();
      if (!isNaN(created) && created < cutoffTime) {
        delete memoryStore.users[uid];
      }
    }
  }

  if (removedCount > 0) {
    persistStore();
  }
  return removedCount;
}

/**
 * Grant staff/admin role to an email
 */
export async function grantStaffRole(email: string, uid?: string): Promise<{ success: boolean; email: string; role: Role }> {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  let targetUid = uid;
  if (!targetUid) {
    const existingUser = Object.values(memoryStore.users).find(u => u.email.toLowerCase() === cleanEmail);
    targetUid = existingUser ? existingUser.id : `staff_${Date.now()}`;
  }

  memoryStore.admins[targetUid] = {
    id: targetUid,
    email: cleanEmail,
    createdAt: memoryStore.admins[targetUid]?.createdAt || now
  };

  if (memoryStore.users[targetUid]) {
    memoryStore.users[targetUid].role = 'staff';
    memoryStore.users[targetUid].updatedAt = now;
  } else {
    memoryStore.users[targetUid] = {
      id: targetUid,
      email: cleanEmail,
      role: 'staff',
      displayName: cleanEmail.split('@')[0],
      createdAt: now,
      updatedAt: now
    };
  }

  persistStore();
  return { success: true, email: cleanEmail, role: 'staff' };
}

/**
 * User & Role Management
 */
export async function syncUserRole(uid: string, email: string, displayName?: string | null): Promise<{ role: Role; isStaff: boolean }> {
  const staff = isStaffEmail(email);
  const role: Role = staff ? 'staff' : 'applicant';
  const now = new Date().toISOString();

  memoryStore.users[uid] = {
    id: uid,
    email,
    role,
    displayName: displayName || null,
    createdAt: memoryStore.users[uid]?.createdAt || now,
    updatedAt: now
  };

  if (staff) {
    memoryStore.admins[uid] = {
      id: uid,
      email,
      createdAt: memoryStore.admins[uid]?.createdAt || now
    };
  } else {
    delete memoryStore.admins[uid];
  }

  persistStore();
  return { role, isStaff: staff };
}

/**
 * Application Management
 */
export async function getApplicationById(id: string): Promise<ApplicationRecord | null> {
  return memoryStore.applications[id] || null;
}

export async function getApplicationByUserId(userId: string): Promise<ApplicationRecord | null> {
  const all = Object.values(memoryStore.applications);
  // Prefer submitted over draft, or latest updated
  const userApps = all.filter(a => a.userId === userId);
  if (!userApps.length) return null;
  userApps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return userApps[0];
}

export async function saveApplication(app: ApplicationRecord): Promise<ApplicationRecord> {
  memoryStore.applications[app.id] = {
    ...app,
    updatedAt: new Date().toISOString()
  };
  persistStore();
  return memoryStore.applications[app.id];
}

export async function getAllApplications(): Promise<ApplicationRecord[]> {
  return Object.values(memoryStore.applications);
}

/**
 * Notification Management
 */
export async function saveNotification(notif: NotificationRecord): Promise<NotificationRecord> {
  memoryStore.notifications[notif.id] = notif;
  persistStore();
  return notif;
}

export async function getNotificationsByUserId(userId: string): Promise<NotificationRecord[]> {
  return Object.values(memoryStore.notifications)
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (memoryStore.notifications[id]) {
    memoryStore.notifications[id].read = true;
    persistStore();
  }
}

/**
 * Generate Application ID: SCH-YYYY-XXX
 */
export function generateApplicationId(): string {
  const year = new Date().getFullYear();
  const existingCount = Object.keys(memoryStore.applications).length + 1;
  const num = String(existingCount).padStart(3, '0');
  return `SCH-${year}-${num}`;
}
