import { ApplicationProblem, ApplicationRecord, NotificationRecord } from './types';

export interface EmailDispatchResult {
  emailStatus: 'sent' | 'failed';
  emailError: string | null;
}

/**
 * Send email via server-side email service using EMAIL_API_KEY.
 * If EMAIL_API_KEY is not set or network request fails, return emailStatus 'failed'
 * with the exact error, ensuring the notification is always saved and shown in the app.
 */
export async function sendEmailNotification(
  recipientEmail: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<EmailDispatchResult> {
  const apiKey = process.env.EMAIL_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return {
      emailStatus: 'failed',
      emailError: 'EMAIL_API_KEY is not configured on the server'
    };
  }

  try {
    // Attempt standard email dispatch (e.g. Resend, Sendgrid, or generic HTTP email gateway)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ApplyFlow Grants <notifications@applyflow.app>',
        to: [recipientEmail],
        subject,
        html: htmlContent,
        text: textContent
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      return {
        emailStatus: 'failed',
        emailError: `Email service responded with status ${response.status}: ${errBody.slice(0, 150)}`
      };
    }

    return {
      emailStatus: 'sent',
      emailError: null
    };
  } catch (error: any) {
    return {
      emailStatus: 'failed',
      emailError: error?.message || 'Failed to dispatch email across network'
    };
  }
}

/**
 * Generate email content and subject based on application status
 */
export function buildNotificationContent(
  application: ApplicationRecord,
  problems?: ApplicationProblem[],
  staffNote?: string
): { subject: string; message: string; text: string; html: string } {
  const appUrl = process.env.APP_URL || 'https://applyflow.app';
  const fixUrl = `${appUrl}/application/fix`;
  const viewUrl = `${appUrl}/application`;

  if (application.status === 'Needs correction') {
    const problemLines = (problems || application.problems || []).map(p => `- ${p.title}: ${p.fixNeeded}`).join('\n');
    const problemHtml = (problems || application.problems || [])
      .map(p => `<li style="margin-bottom: 8px;"><strong>${p.title}:</strong> ${p.fixNeeded}</li>`)
      .join('');

    const subject = `Correction requested for Application #${application.id}`;
    const message = staffNote
      ? `We found problems with your application. Note: ${staffNote}`
      : `We found ${problems?.length || 1} problems with your application. Please fix them so we can check again.`;

    const text = `Hello ${application.applicantName},

${message}

Problems found:
${problemLines}

${staffNote ? `Staff Note:\n${staffNote}\n` : ''}
Please fix and resubmit your application here:
${fixUrl}

Regards,
ApplyFlow`;

    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1F1D1A; background-color: #FAF8F4; border: 1px solid #E4E0D8; border-radius: 6px;">
        <h2 style="color: #9A6700; margin-top: 0;">Correction needed: Application #${application.id}</h2>
        <p>Hello ${application.applicantName},</p>
        <p>${message}</p>
        ${staffNote ? `<div style="background: #FDF6E7; border-left: 4px solid #9A6700; padding: 12px; margin: 16px 0;"><strong>Staff Note:</strong> ${staffNote}</div>` : ''}
        <h3 style="margin-top: 20px;">What needs fixing:</h3>
        <ul>${problemHtml}</ul>
        <div style="margin: 28px 0;">
          <a href="${fixUrl}" style="background-color: #1F1D1A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">Fix and resubmit application</a>
        </div>
        <p style="color: #6B665E; font-size: 13px;">If the button does not work, visit: ${fixUrl}</p>
      </div>
    `;

    return { subject, message, text, html };
  }

  if (application.status === 'Approved') {
    const subject = `Application #${application.id} has been Approved`;
    const message = 'All details match your documents. Your application has been approved.';
    const text = `Hello ${application.applicantName},

Great news! All details match your documents. Your scholarship application #${application.id} has been approved.

View your application status:
${viewUrl}

Regards,
ApplyFlow`;

    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1F1D1A; background-color: #FAF8F4; border: 1px solid #E4E0D8; border-radius: 6px;">
        <h2 style="color: #2F7D4F; margin-top: 0;">Application #${application.id} Approved</h2>
        <p>Hello ${application.applicantName},</p>
        <p>All details match your submitted documents. Your scholarship application has been successfully approved.</p>
        <div style="margin: 28px 0;">
          <a href="${viewUrl}" style="background-color: #1F1D1A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">View application</a>
        </div>
      </div>
    `;

    return { subject, message, text, html };
  }

  if (application.status === 'Rejected') {
    const subject = `Update regarding Application #${application.id}`;
    const reasonText = staffNote || 'Your application does not meet the necessary criteria.';
    const message = `Your application was not approved. ${reasonText}`;
    const text = `Hello ${application.applicantName},

Your scholarship application #${application.id} was reviewed and rejected.
Reason: ${reasonText}

View details:
${viewUrl}

Regards,
ApplyFlow`;

    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1F1D1A; background-color: #FAF8F4; border: 1px solid #E4E0D8; border-radius: 6px;">
        <h2 style="color: #B3362E; margin-top: 0;">Update regarding Application #${application.id}</h2>
        <p>Hello ${application.applicantName},</p>
        <p>Your scholarship application #${application.id} has been reviewed by staff and was not approved.</p>
        <div style="background: #FBECEB; border-left: 4px solid #B3362E; padding: 12px; margin: 16px 0;">
          <strong>Reason:</strong> ${reasonText}
        </div>
        <div style="margin: 28px 0;">
          <a href="${viewUrl}" style="background-color: #1F1D1A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">View application</a>
        </div>
      </div>
    `;

    return { subject, message, text, html };
  }

  // Default status update
  const subject = `Update on Application #${application.id}`;
  const message = `Your application status has been updated to ${application.status}.`;
  return {
    subject,
    message,
    text: `Hello ${application.applicantName},\n\n${message}\n\nView: ${viewUrl}\n\nApplyFlow`,
    html: `<p>Hello ${application.applicantName},</p><p>${message}</p>`
  };
}
