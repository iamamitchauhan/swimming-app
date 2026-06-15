import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/env';
import logger from './logger';

// ─── Transporter (singleton) ─────────────────────────────────────────────────

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth:
        config.SMTP_USERNAME && config.SMTP_PASSWORD
          ? { user: config.SMTP_USERNAME, pass: config.SMTP_PASSWORD }
          : undefined,
    });
  }
  return _transporter;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ─── Core send function ───────────────────────────────────────────────────────

export async function sendMail(options: MailOptions): Promise<void> {
  const transporter = getTransporter();
  const from = `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]*>/g, ''),
    });
    logger.info({ to: options.to, subject: options.subject, messageId: info.messageId }, 'email.sent');
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, 'email.send.failed');
    throw err;
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

export async function sendEmailVerification(opts: {
  to: string;
  verifyUrl: string;
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: 'Verify Your Email Address | Swimming App',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#2563eb;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">
                    <h2 style="margin-top:0;color:#111827;">
                      Welcome to Swimming App! 👋
                    </h2>

                    <p style="font-size:16px;line-height:24px;">
                      Thank you for creating an account. To complete your registration and start using Swimming App, please verify your email address.
                    </p>

                    <div style="text-align:center;margin:36px 0;">
                      <a
                        href="${opts.verifyUrl}"
                        style="
                          background:#2563eb;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 32px;
                          border-radius:8px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Verify Email Address
                      </a>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      This verification link will expire in <strong>24 hours</strong>.
                    </p>

                    <p style="font-size:15px;line-height:24px;">
                      If the button above does not work, copy and paste the following URL into your browser:
                    </p>

                    <p style="
                      word-break:break-all;
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      padding:12px;
                      border-radius:6px;
                      font-size:13px;
                      color:#4b5563;
                    ">
                      ${opts.verifyUrl}
                    </p>

                    <p style="font-size:15px;line-height:24px;margin-top:30px;">
                      If you did not create an account with Swimming App, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}

export async function sendOtp(opts: {
  to: string;
  otp: string;
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: `Your Login OTP: ${opts.otp} | Swimming App`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background:#2563eb;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">
                    <h2 style="margin-top:0;color:#111827;">
                      Verify Your Login
                    </h2>

                    <p style="font-size:16px;line-height:24px;margin-bottom:24px;">
                      Use the One-Time Password (OTP) below to securely log in to your account.
                    </p>

                    <div style="text-align:center;margin:32px 0;">
                      <div style="
                        display:inline-block;
                        background:#eff6ff;
                        color:#2563eb;
                        font-size:42px;
                        font-weight:700;
                        letter-spacing:10px;
                        padding:20px 30px;
                        border-radius:10px;
                        border:2px dashed #93c5fd;
                      ">
                        ${opts.otp}
                      </div>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      This OTP is valid for <strong>10 minutes</strong>.
                    </p>

                    <p style="font-size:15px;line-height:24px;">
                      For your security, never share this code with anyone.
                    </p>

                    <p style="font-size:15px;line-height:24px;margin-top:30px;">
                      If you did not request this login, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}

export async function sendClubSubmittedNotification(opts: {
  to: string;
  clubName: string;
  dashboardUrl?: string;
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: `New Club Application: ${opts.clubName} | Swimming App`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#2563eb;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">
                    <h2 style="margin-top:0;color:#111827;">
                      New Club Application Received
                    </h2>

                    <p style="font-size:16px;line-height:24px;">
                      A new club application has been submitted and is awaiting review.
                    </p>

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      style="
                        margin:24px 0;
                        background:#f9fafb;
                        border:1px solid #e5e7eb;
                        border-radius:8px;
                      "
                    >
                      <tr>
                        <td style="padding:20px;">
                          <p style="margin:0;font-size:14px;color:#6b7280;">
                            Club Name
                          </p>
                          <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#111827;">
                            ${opts.clubName}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:15px;line-height:24px;">
                      Please log in to the admin dashboard to review the application and take the appropriate action.
                    </p>

                    ${
                      opts.dashboardUrl
                        ? `
                    <div style="text-align:center;margin:32px 0;">
                      <a
                        href="${opts.dashboardUrl}"
                        style="
                          background:#2563eb;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 30px;
                          border-radius:8px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Review Application
                      </a>
                    </div>
                    `
                        : ''
                    }
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      This is an automated notification from Swimming App.
                    </p>
                    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}

export async function sendClubApproved(opts: {
  to: string;
  clubName: string;
  loginUrl?: string;
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: `🎉 Club Approved: ${opts.clubName} | Swimming App`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#16a34a;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="font-size:56px;">🎉</div>
                    </div>

                    <h2 style="margin-top:0;text-align:center;color:#111827;">
                      Congratulations!
                    </h2>

                    <p style="font-size:16px;line-height:24px;text-align:center;">
                      Your club application has been reviewed and approved.
                    </p>

                    <div style="
                      margin:30px 0;
                      padding:24px;
                      background:#f0fdf4;
                      border:1px solid #bbf7d0;
                      border-radius:10px;
                      text-align:center;
                    ">
                      <p style="margin:0;font-size:14px;color:#6b7280;">
                        Approved Club
                      </p>

                      <p style="
                        margin:10px 0 0;
                        font-size:24px;
                        font-weight:700;
                        color:#15803d;
                      ">
                        ${opts.clubName}
                      </p>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      Your club is now active on Swimming App and ready to use.
                    </p>

                    <p style="font-size:15px;line-height:24px;">
                      You can now log in to your account and start managing your club, members, events, and activities.
                    </p>

                    ${
                      opts.loginUrl
                        ? `
                    <div style="text-align:center;margin:36px 0;">
                      <a
                        href="${opts.loginUrl}"
                        style="
                          background:#16a34a;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 32px;
                          border-radius:8px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Go to Dashboard
                      </a>
                    </div>
                    `
                        : ''
                    }

                    <p style="font-size:15px;line-height:24px;margin-top:30px;">
                      Thank you for joining Swimming App. We're excited to have your club as part of our community.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}

export async function sendClubRejected(opts: {
  to: string;
  clubName: string;
  reason: string;
  supportEmail?: string;
  
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: `Club Application Update: ${opts.clubName} | Swimming App`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#dc2626;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">
                    
                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="font-size:56px;">📋</div>
                    </div>

                    <h2 style="margin-top:0;text-align:center;color:#111827;">
                      Club Application Update
                    </h2>

                    <p style="font-size:16px;line-height:24px;text-align:center;">
                      Thank you for your interest in joining Swimming App.
                    </p>

                    <p style="font-size:16px;line-height:24px;">
                      After reviewing your application, we are unable to approve the registration for the club below at this time.
                    </p>

                    <div style="
                      margin:30px 0;
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      border-radius:10px;
                      overflow:hidden;
                    ">
                      <div style="padding:20px;">
                        <p style="margin:0;font-size:14px;color:#6b7280;">
                          Club Name
                        </p>
                        <p style="margin:8px 0 0;font-size:22px;font-weight:600;color:#111827;">
                          ${opts.clubName}
                        </p>
                      </div>
                    </div>

                    <div style="
                      margin:24px 0;
                      background:#fef2f2;
                      border:1px solid #fecaca;
                      border-radius:10px;
                      padding:20px;
                    ">
                      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#991b1b;">
                        Reason
                      </p>

                      <p style="margin:0;font-size:15px;line-height:24px;color:#7f1d1d;">
                        ${opts.reason}
                      </p>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      You may review the information provided in your application and submit an updated application if applicable.
                    </p>

                    <p style="font-size:15px;line-height:24px;">
                      If you believe this decision was made in error or need further clarification, please contact our support team.
                    </p>

                    ${
                      opts.supportEmail
                        ? `
                    <div style="text-align:center;margin:32px 0;">
                      <a
                        href="mailto:${opts.supportEmail}"
                        style="
                          background:#2563eb;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 30px;
                          border-radius:8px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Contact Support
                      </a>
                    </div>
                    `
                        : ''
                    }

                    <p style="font-size:15px;line-height:24px;margin-top:30px;">
                      We appreciate your interest in Swimming App and encourage you to apply again after addressing the concerns noted above.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}

export async function sendInvitation(opts: {
  to: string;
  inviterName: string;
  clubName: string;
  role: string;
  acceptUrl: string;
}): Promise<void> {
  await sendMail({
  to: opts.to,
  subject: `Invitation to Join ${opts.clubName} as ${opts.role} | Swimming App`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#2563eb;padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      Swimming App
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:#374151;">

                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="font-size:56px;">🏊</div>
                    </div>

                    <h2 style="margin-top:0;text-align:center;color:#111827;">
                      You're Invited!
                    </h2>

                    <p style="font-size:16px;line-height:24px;text-align:center;">
                      You have received an invitation to join a club on Swimming App.
                    </p>

                    <div style="
                      margin:30px 0;
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      border-radius:10px;
                      padding:24px;
                    ">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:16px;">
                            <p style="margin:0;font-size:13px;color:#6b7280;">
                              Invited By
                            </p>
                            <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#111827;">
                              ${opts.inviterName}
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding-bottom:16px;">
                            <p style="margin:0;font-size:13px;color:#6b7280;">
                              Club
                            </p>
                            <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#111827;">
                              ${opts.clubName}
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td>
                            <p style="margin:0;font-size:13px;color:#6b7280;">
                              Role
                            </p>
                            <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#2563eb;">
                              ${opts.role}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      By accepting this invitation, you'll gain access to the club and be able to perform actions according to your assigned role.
                    </p>

                    <div style="text-align:center;margin:36px 0;">
                      <a
                        href="${opts.acceptUrl}"
                        style="
                          background:#2563eb;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 32px;
                          border-radius:8px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Accept Invitation
                      </a>
                    </div>

                    <p style="font-size:15px;line-height:24px;">
                      This invitation will expire in <strong>48 hours</strong>.
                    </p>

                    <p style="font-size:15px;line-height:24px;">
                      If the button above does not work, copy and paste the following link into your browser:
                    </p>

                    <p style="
                      word-break:break-all;
                      background:#f9fafb;
                      border:1px solid #e5e7eb;
                      padding:12px;
                      border-radius:6px;
                      font-size:13px;
                      color:#4b5563;
                    ">
                      ${opts.acceptUrl}
                    </p>

                    <p style="font-size:15px;line-height:24px;margin-top:30px;">
                      If you were not expecting this invitation, you can safely ignore this email.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      © ${new Date().getFullYear()} Swimming App. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
});
}
