import { Resend } from 'resend';
import { createLogger } from '../logger';
import { config } from '../config';
const log = createLogger('email-service');
const resend = new Resend(config.RESEND_API_KEY || '');
const FROM_EMAIL = config.RESEND_FROM_EMAIL;
const APP_NAME = 'Smart Attendance';
function isConfigured(): boolean {
  const key = config.RESEND_API_KEY;
  return !!key && !key.startsWith('re_your');
}
// ============================================================
// Email Templates
// ============================================================
function baseTemplate(content: string, footer?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<div style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:24px 32px;">
<h1 style="color:#fff;margin:0;font-size:20px;">${APP_NAME}</h1>
</div>
<div style="padding:32px;">
${content}
</div>
<div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
${footer || 'This is an automated message from ' + APP_NAME + '. Please do not reply.'}
</p>
</div>
</div>
</body>
</html>`;
}
// ============================================================
// Email Service
// ============================================================
class EmailService {
  // 1. Welcome Email -- New user created
  async sendWelcomeEmail(params: {
    to: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    tempPassword?: string;
    resetLink?: string;
    orgName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping welcome email'); return; }
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">Welcome to ${params.orgName}!</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.firstName},</p>
<p style="color:#374151;font-size:15px;">Your account has been created on ${APP_NAME}. Here are your login details:</p>
<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Employee ID</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.employeeId}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Email</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.to}</td></tr>
${params.tempPassword ? `<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Password</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.tempPassword}</td></tr>` : ''}
</table>
</div>
<p style="color:#374151;font-size:14px;">Please change your password after first login.</p>`;
    await this.send(params.to, 'Welcome to ' + params.orgName + ' -- ' + APP_NAME, content);
  }

  // 2. Leave Request Submitted -- Notify admin
  async sendLeaveRequestNotification(params: {
    adminEmail: string;
    adminName: string;
    employeeName: string;
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    orgName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping leave notification'); return; }
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">New Leave Request</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.adminName},</p>
<p style="color:#374151;font-size:15px;"><strong>${params.employeeName}</strong> (${params.employeeId}) has submitted a leave request:</p>
<div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Type</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.leaveType}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">From</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.startDate}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">To</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.endDate}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Reason</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.reason}</td></tr>
</table>
</div>
<p style="color:#374151;font-size:14px;">Please review and approve/reject this request in the ${APP_NAME} dashboard.</p>`;
    await this.send(params.adminEmail, 'Leave Request from ' + params.employeeName, content);
  }

  // 3. Leave Approved/Rejected -- Notify employee
  async sendLeaveDecisionNotification(params: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: 'APPROVED' | 'REJECTED';
    approverName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping leave decision'); return; }
    const isApproved = params.status === 'APPROVED';
    const color = isApproved ? '#059669' : '#dc2626';
    const bgColor = isApproved ? '#ecfdf5' : '#fef2f2';
    const borderColor = isApproved ? '#a7f3d0' : '#fecaca';
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">Leave ${params.status}</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.employeeName},</p>
<p style="color:#374151;font-size:15px;">Your leave request has been <strong style="color:${color};">${params.status.toLowerCase()}</strong> by ${params.approverName}.</p>
<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Type</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.leaveType}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">From</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.startDate}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">To</td><td style="color:#111827;font-weight:600;padding:4px 0;font-size:14px;">${params.endDate}</td></tr>
<tr><td style="color:#6b7280;padding:4px 0;font-size:14px;">Status</td><td style="color:${color};font-weight:700;padding:4px 0;font-size:14px;">${params.status}</td></tr>
</table>
</div>`;
    await this.send(params.to, 'Leave ' + params.status + ' -- ' + params.leaveType, content);
  }

  // 4. Payroll Ready -- Notify employee
  async sendPayrollReadyNotification(params: {
    to: string;
    employeeName: string;
    bsMonth: string;
    bsYear: number;
    netSalary: string;
    orgName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping payroll notification'); return; }
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">Payslip Ready </h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.employeeName},</p>
<p style="color:#374151;font-size:15px;">Your payslip for <strong>${params.bsMonth} ${params.bsYear}</strong> is now available.</p>
<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
<p style="color:#6b7280;font-size:13px;margin:0 0 4px;">Net Salary</p>
<p style="color:#7c3aed;font-size:28px;font-weight:700;margin:0;">Rs. ${params.netSalary}</p>
</div>
<p style="color:#374151;font-size:14px;">Log in to ${APP_NAME} to view the full payslip and download PDF.</p>`;
    await this.send(params.to, 'Payslip Ready -- ' + params.bsMonth + ' ' + params.bsYear, content);
  }

  // 5. Payroll Bulk Notify -- All employees
  async sendPayrollBulkNotification(records: Array<{
    email: string;
    firstName: string;
    netSalary: number;
    bsMonth: string;
    bsYear: number;
    orgName: string;
  }>) {
    if (!isConfigured()) { log.warn('Email not configured, skipping bulk payroll notification'); return; }
    let sent = 0;
    for (const r of records) {
      try {
        await this.sendPayrollReadyNotification({
          to: r.email,
          employeeName: r.firstName,
          bsMonth: r.bsMonth,
          bsYear: r.bsYear,
          netSalary: r.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          orgName: r.orgName,
        });
        sent++;
      } catch (err) {
        log.error({ email: r.email, error: err }, 'Failed to send payroll email');
      }
    }
    log.info({ total: records.length, sent }, 'Bulk payroll emails sent');
    return { total: records.length, sent };
  }

  // 6. Trial Expiry Warning -- 7 day and 1 day nudge
  async sendTrialExpiryWarning(params: {
    to: string;
    orgName: string;
    adminName: string;
    daysLeft: number;
    trialEndsAt: Date;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping trial warning'); return; }
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">Your trial ends in ${params.daysLeft} day${params.daysLeft === 1 ? '' : 's'}</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.adminName},</p>
<p style="color:#374151;font-size:15px;">Your ${APP_NAME} trial for <strong>${params.orgName}</strong> expires on <strong>${params.trialEndsAt.toDateString()}</strong>.</p>
<p style="color:#374151;font-size:15px;">To keep your attendance data, payroll records, and team access uninterrupted, upgrade to Operations before your trial ends.</p>
<div style="margin:24px 0;">
<a href="${process.env.APP_URL ?? '#'}/billing" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Upgrade Now</a>
</div>
<p style="color:#9ca3af;font-size:13px;">Rs. 250 per employee per month. Cancel anytime.</p>`;
    await this.send(params.to, `Your ${APP_NAME} trial ends in ${params.daysLeft} day${params.daysLeft === 1 ? '' : 's'}`, content);
  }

  // 7. Trial Expired -- access paused
  async sendTrialExpiredNotice(params: {
    to: string;
    orgName: string;
    adminName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping trial expired notice'); return; }
    const content = `
<h2 style="color:#dc2626;margin:0 0 8px;">Your trial has ended</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.adminName},</p>
<p style="color:#374151;font-size:15px;">Your ${APP_NAME} trial for <strong>${params.orgName}</strong> has expired. Your data is safe, but your team's access has been paused.</p>
<p style="color:#374151;font-size:15px;">Upgrade to Operations to restore full access immediately.</p>
<div style="margin:24px 0;">
<a href="${process.env.APP_URL ?? '#'}/billing" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Restore Access</a>
</div>
<p style="color:#9ca3af;font-size:13px;">Need help? Reply to this email and we'll sort it out.</p>`;
    await this.send(params.to, `Your ${APP_NAME} trial has ended -- restore access now`, content);
  }

  // 8. Post-trial nudge -- 3 days after expiry (last attempt)
  async sendTrialConversionNudge(params: {
    to: string;
    orgName: string;
    adminName: string;
  }) {
    if (!isConfigured()) { log.warn('Email not configured, skipping conversion nudge'); return; }
    const content = `
<h2 style="color:#111827;margin:0 0 8px;">Still thinking about it?</h2>
<p style="color:#6b7280;font-size:15px;">Hi ${params.adminName},</p>
<p style="color:#374151;font-size:15px;">Your ${APP_NAME} trial for <strong>${params.orgName}</strong> ended a few days ago. Your data is still here -- we haven't deleted anything.</p>
<p style="color:#374151;font-size:15px;">If something stopped you from upgrading, reply to this email and let us know. We'd love to help.</p>
<div style="margin:24px 0;">
<a href="${process.env.APP_URL ?? '#'}/billing" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Upgrade and Restore Access</a>
</div>`;
    await this.send(params.to, `Your ${APP_NAME} data is waiting -- come back anytime`, content);
  }

  // 9. Billing Renewal Reminder -- 7 days before due date
  async sendBillingReminder(params: {
    to: string;
    orgName: string;
    daysUntilBilling: number;
    amountDue: number;
    planName: string;
    billingDate: Date;
    employeeCount: number;
    pricePerEmployee: number;
  }): Promise<void> {
    if (!isConfigured()) { log.warn('Email not configured, skipping billing reminder'); return; }
    const billingDateStr = params.billingDate.toLocaleDateString('en-NP', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const content = `
<h2 style="color:#1e293b;margin:0 0 16px">Subscription Renewal Reminder</h2>
<p style="color:#475569;margin:0 0 16px">
  Hi, this is a reminder that your <strong>${params.planName}</strong> subscription
  for <strong>${params.orgName}</strong> renews on <strong>${billingDateStr}</strong>.
</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 20px">
  <p style="margin:0 0 8px;color:#64748b;font-size:14px">Amount due</p>
  <p style="margin:0;font-size:28px;font-weight:700;color:#1e293b">Rs. ${params.amountDue.toLocaleString()}</p>
  <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">
    ${params.employeeCount} employees X— Rs. ${params.pricePerEmployee}/employee
  </p>
</div>
<p style="color:#475569;margin:0 0 16px">
  Please make your payment via bank transfer, eSewa, or Khalti before the due date
  and send your receipt to us on WhatsApp to avoid any interruption.
</p>
<p style="color:#94a3b8;font-size:13px;margin:0">Questions? Reply to this email or reach us on WhatsApp.</p>`;
    await this.send(
      params.to,
      `Subscription renewal in ${params.daysUntilBilling} days -- ${params.orgName}`,
      content
    );
  }

  // 10. Payment Due Notice -- billing date passed, grace period started
  async sendPaymentDueNotice(params: {
    to: string;
    orgName: string;
    amountDue: number;
    planName: string;
    employeeCount: number;
    pricePerEmployee: number;
    gracePeriodDays: number;
  }): Promise<void> {
    if (!isConfigured()) { log.warn('Email not configured, skipping payment due notice'); return; }
    const content = `
<h2 style="color:#dc2626;margin:0 0 16px">Payment Due</h2>
<p style="color:#475569;margin:0 0 16px">
  Your <strong>${params.planName}</strong> subscription for <strong>${params.orgName}</strong>
  has reached its renewal date. Your access will continue for a
  <strong>${params.gracePeriodDays}-day grace period</strong> while we await payment.
</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 20px">
  <p style="margin:0 0 8px;color:#dc2626;font-size:14px;font-weight:600">Amount due immediately</p>
  <p style="margin:0;font-size:28px;font-weight:700;color:#1e293b">Rs. ${params.amountDue.toLocaleString()}</p>
  <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">
    ${params.employeeCount} employees Ã— Rs. ${params.pricePerEmployee}/employee
  </p>
</div>
<p style="color:#b91c1c;font-weight:600;margin:0 0 16px">
  If payment is not received within ${params.gracePeriodDays} days, your account will be suspended.
</p>
<p style="color:#475569;margin:0 0 8px">
  Please pay via bank transfer, eSewa, or Khalti and send your receipt via WhatsApp immediately.
</p>
<p style="color:#94a3b8;font-size:13px;margin:0">
  Already paid? Reply to this email with your receipt and we'll reactivate your account within 1 business day.
</p>`;
    await this.send(
      params.to,
      `Action required: Payment due for ${params.orgName}`,
      content
    );
  }

  // 11. Suspension Notice -- grace period expired, account suspended
  async sendSuspensionNotice(params: {
    to: string;
    orgName: string;
    gracePeriodDays: number;
  }): Promise<void> {
    if (!isConfigured()) { log.warn('Email not configured, skipping suspension notice'); return; }
    const content = `
<h2 style="color:#dc2626;margin:0 0 16px">Account Suspended</h2>
<p style="color:#475569;margin:0 0 16px">
  Your ${APP_NAME} account for <strong>${params.orgName}</strong> has been suspended
  because payment was not received within the ${params.gracePeriodDays}-day grace period.
</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 20px">
  <p style="margin:0;color:#b91c1c;font-weight:600;">
    Your data is safe. Access will be restored immediately once payment is confirmed.
  </p>
</div>
<p style="color:#475569;margin:0 0 8px">
  To restore access, please make your payment and send the receipt via WhatsApp or reply to this email.
  We will reactivate your account within 1 business day of receiving confirmation.
</p>
<p style="color:#94a3b8;font-size:13px;margin:0">Need help? Reply to this email and we'll sort it out together.</p>`;
    await this.send(
      params.to,
      `Account suspended -- ${params.orgName}`,
      content
    );
  }

  // ============================================================
  // Core send method
  // ============================================================
  private async send(to: string, subject: string, htmlContent: string) {
    try {
      const html = baseTemplate(htmlContent);
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      log.info({ to, subject, id: result.data?.id }, 'Email sent');
      return result;
    } catch (error: any) {
      log.error({ to, subject, error: error.message }, 'Email send failed');
      throw error;
    }
  }
}

export const emailService = new EmailService();