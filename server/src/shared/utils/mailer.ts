import nodemailer from "nodemailer";
import type { Options as SESOptions } from "nodemailer/lib/ses-transport";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { config } from "../../config/env";
import logger from "./logger";

// ─── Transporter (singleton) ─────────────────────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    const sesv2 = new SESv2Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    });
    _transporter = nodemailer.createTransport({
      SES: { sesClient: sesv2, SendEmailCommand },
    } as SESOptions);
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
  const from = `"${config.SES_FROM_NAME}" <${config.SES_FROM_EMAIL}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]*>/g, ""),
    });
    logger.info({ to: options.to, subject: options.subject, messageId: info.messageId }, "email.sent");
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, "email.send.failed");
    throw err;
  }
}

// ─── Email templates ─────────────────────────────────────────────────────────

export async function sendEmailVerification(opts: { to: string; verifyUrl: string }): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: "Verify Your Email Address | Swimming App",
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
                      Welcome to Swimming App!
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

export async function sendOtp(opts: { to: string; otp: string }): Promise<void> {
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

export async function sendClubSubmittedNotification(opts: { to: string; clubName: string; dashboardUrl?: string }): Promise<void> {
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
                        : ""
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

export async function sendClubApproved(opts: { to: string; clubName: string; loginUrl?: string }): Promise<void> {
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
                        : ""
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

export async function sendClubRejected(opts: { to: string; clubName: string; reason: string; supportEmail?: string }): Promise<void> {
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
                        : ""
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

export async function sendInvitation(opts: { to: string; inviterName: string; clubName: string; role: string; acceptUrl: string }): Promise<void> {
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

export async function sendRegistrationOffer(opts: {
  to: string;
  swimmerName: string;
  parentName: string;
  tryoutName: string;
  location: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
}) {
  await sendMail({
    to: opts.to,
    subject: `Congratulations — Team Spot Offered`,
    html: `<div style=" margin:30px 0; padding:24px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; text-align:center; " > <p style="margin:0;font-size:14px;color:#6b7280;"> Accepted Swimmer </p> <p style=" margin:10px 0 0; font-size:24px; font-weight:700; color:#15803d; " > ${opts.swimmerName} </p> </div> <p style="font-size:15px;line-height:24px;"> Dear ${opts.parentName}, </p> <p style="font-size:15px;line-height:24px;"> We are excited to share that <strong>${opts.swimmerName}</strong> has been offered a spot on our swim team following their tryout evaluation. </p> <p style="font-size:15px;line-height:24px;"> Our coaching team was impressed by <strong>${opts.swimmerName}</strong>'s skills, effort, and potential, and we look forward to welcoming them to the team. </p> <!-- Tryout Details --> <div style=" margin:32px 0; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; overflow:hidden; " > <div style=" background:#dbeafe; padding:14px 20px; font-size:18px; font-weight:700; color:#1e40af; " > 📋 Tryout Details </div> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; font-weight:600; width:35%; " > Swimmer </td> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; " > ${opts.swimmerName} </td> </tr> <tr> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; font-weight:600; " > Tryout </td> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; " > ${opts.tryoutName} </td> </tr> <tr> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; font-weight:600; " > Date </td> <td style=" padding:14px 20px; border-bottom:1px solid #dbeafe; " > ${opts.sessionDate} </td> </tr> <tr> <td style=" padding:14px 20px; font-weight:600; " > Location </td> <td style=" padding:14px 20px; " > ${opts.location} </td> </tr> </table> </div> <!-- Next Steps --> <div style=" margin:24px 0; padding:20px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; " > <p style="margin:0 0 12px;font-weight:700;color:#1d4ed8;"> What's Next? </p> <p style="margin:0;font-size:14px;line-height:22px;"> You will receive another email shortly with a link to complete the team registration process. </p> <p style="margin:12px 0 0;font-size:14px;line-height:22px;"> That email will include important details such as practice schedule, start date, team information, and next steps to get started. </p> </div> <p style="font-size:15px;line-height:24px;"> We are excited to support <strong>${opts.swimmerName}</strong>'s continued growth, confidence, and success in swimming. </p> <p style=" font-size:18px; line-height:28px; font-weight:700; color:#15803d; text-align:center; margin:30px 0; " > Welcome to the team! </p> <p style="font-size:15px;line-height:24px;margin-top:30px;"> Best regards,<br /> The Coaching Team </p>`,
  });

  //  await sendMail({
  //   to: opts.to,
  //   subject: `🎉 Registration Accepted: ${opts.swimmerName} | Swimming App`,
  //   html: `
  //     <!DOCTYPE html>
  //     <html>
  //       <head>
  //         <meta charset="UTF-8" />
  //         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  //       </head>
  //       <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
  //         <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb;padding:40px 20px;">
  //           <tr>
  //             <td align="center">
  //               <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

  //                 <!-- Header -->
  //                 <tr>
  //                   <td align="center" style="background:#16a34a;padding:30px;">
  //                     <h1 style="margin:0;color:#ffffff;font-size:28px;">
  //                       Swimming App
  //                     </h1>
  //                   </td>
  //                 </tr>

  //                 <!-- Content -->
  //                 <tr>
  //                   <td style="padding:40px 30px;color:#374151;">
  //                     <div style="text-align:center;margin-bottom:24px;">
  //                       <div style="font-size:56px;">🎉</div>
  //                     </div>

  //                     <h2 style="margin-top:0;text-align:center;color:#111827;">
  //                       Congratulations!
  //                     </h2>

  //                     <p style="font-size:16px;line-height:24px;text-align:center;">
  //                       We are excited to share some great news.
  //                     </p>

  //                     <div style="
  //                       margin:30px 0;
  //                       padding:24px;
  //                       background:#f0fdf4;
  //                       border:1px solid #bbf7d0;
  //                       border-radius:10px;
  //                       text-align:center;
  //                     ">
  //                       <p style="margin:0;font-size:14px;color:#6b7280;">
  //                         Accepted Swimmer
  //                       </p>

  //                       <p style="
  //                         margin:10px 0 0;
  //                         font-size:24px;
  //                         font-weight:700;
  //                         color:#15803d;
  //                       ">
  //                         ${opts.swimmerName}
  //                       </p>
  //                     </div>

  //                     <p style="font-size:15px;line-height:24px;">
  //                       Dear ${opts.parentName},
  //                     </p>

  //                     <p style="font-size:15px;line-height:24px;">
  //                       We are pleased to inform you that
  //                       <strong>${opts.swimmerName}</strong> has been selected and offered a spot on our swimming team.
  //                     </p>

  //                     <p style="font-size:15px;line-height:24px;">
  //                       This achievement reflects the effort, dedication, and potential demonstrated throughout the registration and evaluation process.
  //                     </p>

  //                     <p style="font-size:15px;line-height:24px;">
  //                       We look forward to welcoming your family to the club and supporting ${opts.swimmerName}'s continued growth and success in swimming.
  //                     </p>

  //                     <p style="font-size:15px;line-height:24px;margin-top:30px;">
  //                       Best regards,<br />
  //                       The Coaching Team
  //                     </p>
  //                   </td>
  //                 </tr>

  //                 <!-- Footer -->
  //                 <tr>
  //                   <td style="padding:20px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
  //                     <p style="margin:0;font-size:13px;color:#6b7280;">
  //                       © ${new Date().getFullYear()} Swimming App. All rights reserved.
  //                     </p>
  //                   </td>
  //                 </tr>

  //               </table>
  //             </td>
  //           </tr>
  //         </table>
  //       </body>
  //     </html>
  //   `,
  // });
}

export async function sendRegistrationReject(opts: { to: string; swimmerName: string; parentName: string; tryoutName: string; sessionDate: string }) {
  await sendMail({
    to: opts.to,
    subject: `Tryout Result for ${opts.swimmerName} | Swimming App`,
    html: `<div style="text-align:center;margin-bottom:24px;"> <div style="font-size:56px;">📋</div> </div> <h2 style="margin-top:0;text-align:center;color:#111827;"> Tryout Evaluation Update </h2> <p style="font-size:15px;line-height:24px;"> Dear ${opts.parentName}, </p> <div style=" margin:30px 0; padding:24px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; text-align:center; " > <p style="margin:0;font-size:14px;color:#6b7280;"> Swimmer </p> <p style=" margin:10px 0 0; font-size:24px; font-weight:700; color:#b91c1c; " > ${opts.swimmerName} </p> </div> <p style="font-size:15px;line-height:24px;"> Thank you for bringing <strong>${opts.swimmerName}</strong> to our swimming tryout and for giving our coaching team the opportunity to meet them. </p> <p style="font-size:15px;line-height:24px;"> After reviewing the tryout evaluation, we have decided not to offer a team spot at this time. </p> <p style="font-size:15px;line-height:24px;"> We appreciate the effort and enthusiasm <strong>${opts.swimmerName}</strong> showed during the evaluation. Swimming development takes time, and we encourage <strong>${opts.swimmerName}</strong> to continue practicing and building their skills. </p> <!-- Tryout Details --> <div style=" margin:32px 0; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; " > <div style=" background:#f3f4f6; padding:14px 20px; font-size:18px; font-weight:700; color:#111827; " > 📋 Tryout Details </div> <table width="100%" cellpadding="0" cellspacing="0"> <tr> <td style=" padding:14px 20px; border-bottom:1px solid #e5e7eb; font-weight:600; width:35%; " > Swimmer </td> <td style=" padding:14px 20px; border-bottom:1px solid #e5e7eb; " > ${opts.swimmerName} </td> </tr> <tr> <td style=" padding:14px 20px; border-bottom:1px solid #e5e7eb; font-weight:600; " > Tryout </td> <td style=" padding:14px 20px; border-bottom:1px solid #e5e7eb; " > ${opts.tryoutName} </td> </tr> <tr> <td style=" padding:14px 20px; font-weight:600; " > Date </td> <td style=" padding:14px 20px; " > ${opts.sessionDate} </td> </tr> </table> </div> <div style=" margin:24px 0; padding:18px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; " > <p style="margin:0;font-size:14px;line-height:22px;"> We wish <strong>${opts.swimmerName}</strong> continued success in their swimming journey and hope to see them again in the future. </p> </div> <p style="font-size:15px;line-height:24px;margin-top:30px;"> Best regards,<br /> The Coaching Team </p>`,
  });
}

export async function sendRegistrationReceivedEmail(opts: {
  to: string;
  parentName: string;
  swimmerName: string;
  tryoutName: string;
  location: string;
  slotLabel: string;
}): Promise<any> {
  const currentYear = new Date().getFullYear();

  const html = `<table
  width="600"
  cellpadding="0"
  cellspacing="0"
  style="
    max-width:600px;
    background:#ffffff;
    border-radius:12px;
    overflow:hidden;
    border:1px solid #e5e7eb;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <!-- Header -->
  <tr>
    <td align="center" style="background:#2563eb;padding:28px;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;">
        Swimming App
      </h1>
    </td>
  </tr>

  <!-- Content -->
  <tr>
    <td style="padding:36px 30px;color:#374151;">

      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">🏊</div>

        <h2 style="margin:16px 0 8px;color:#111827;">
          Tryout Registration Confirmed
        </h2>

        <p style="margin:0;font-size:15px;line-height:24px;color:#6b7280;">
          Thank you for registering for a swimming tryout. We look forward to seeing you soon.
        </p>
      </div>

      <p style="font-size:15px;line-height:24px;">
        Hi ${opts.parentName},
      </p>

      <p style="font-size:15px;line-height:24px;">
        Your swimmer, <strong>${opts.swimmerName}</strong>, has been successfully
        registered for the following tryout.
      </p>

      <!-- Details -->
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          margin:28px 0;
          border:1px solid #e5e7eb;
          border-radius:8px;
        "
      >
        <tr>
          <td style="padding:16px 20px;background:#f9fafb;font-weight:bold;" colspan="2">
            Tryout Details
          </td>
        </tr>

        <tr>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;font-weight:600;width:35%;">
            Swimmer
          </td>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;">
            ${opts.swimmerName}
          </td>
        </tr>

        <tr>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;font-weight:600;">
            Tryout
          </td>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;">
            ${opts.tryoutName}
          </td>
        </tr>

        <tr>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;font-weight:600;">
            Date & Time
          </td>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;">
            ${opts.slotLabel}
          </td>
        </tr>

        <tr>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;font-weight:600;">
            Location
          </td>
          <td style="padding:14px 20px;border-top:1px solid #e5e7eb;">
            ${opts.location}
          </td>
        </tr>
      </table>

      <!-- Reminder -->
      <div
        style="
          padding:18px 20px;
          background:#f9fafb;
          border-left:4px solid #2563eb;
          margin:28px 0;
        "
      >
        <strong>Before you arrive</strong>

        <ul style="margin:12px 0 0 18px;padding:0;color:#4b5563;font-size:14px;line-height:22px;">
          <li>Please arrive 10 minutes early for check-in.</li>
          <li>Bring swimwear, goggles, and any required swim equipment.</li>
        </ul>
      </div>

      <p style="font-size:15px;line-height:24px;">
        If you have any questions before the tryout, feel free to contact us.
      </p>

      <p style="margin-top:28px;font-size:15px;line-height:24px;">
        Best regards,<br>
        <strong>The Coaching Team</strong>
      </p>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td
      style="
        padding:18px 30px;
        text-align:center;
        background:#f9fafb;
        border-top:1px solid #e5e7eb;
        color:#6b7280;
        font-size:13px;
      "
    >
      © ${currentYear} Swimming App. All rights reserved.
    </td>
  </tr>

</table>`;

  await sendMail({
    to: opts.to,
    subject: `✅ Registration Received: ${opts.tryoutName} | Swimming App`,
    html,
  });
}

// ─── Waitlist confirmation email ─────────────────────────────────────────────

export async function sendWaitlistConfirmationEmail(opts: { to: string; swimmerName: string; tryoutName: string }): Promise<void> {
  const html = `
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
                  <h1 style="margin:0;color:#ffffff;font-size:28px;">SwimTryout</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px 30px;color:#374151;">
                  <h2 style="margin-top:0;color:#111827;">You're on the Waitlist!</h2>

                  <p style="font-size:16px;line-height:24px;">Hello Parent/Guardian,</p>

                  <p style="font-size:16px;line-height:24px;">
                    Thank you for registering for the SwimTryout for your swimmer <strong>${opts.swimmerName}</strong>.
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    We have received your registration for <strong>${opts.tryoutName}</strong> and your swimmer has been added to the waitlist.
                    We will notify you as soon as a spot becomes available.
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    If a slot opens up, you will receive an email with a link to complete the signup process.
                    Spots will be offered on a first-come, first-served basis, so please complete the registration
                    as soon as possible once you receive the invitation.
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    Thank you for your patience, and we look forward to seeing your swimmer at the tryout.
                  </p>

                  <p style="font-size:16px;line-height:24px;margin-bottom:0;">
                    Best,<br/>
                    <strong>SwimTryout Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background:#f9fafb;padding:20px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#6b7280;font-size:13px;">
                    &copy; ${new Date().getFullYear()} SwimTryout. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  await sendMail({
    to: opts.to,
    subject: "Your SwimTryout Registration is on the Waitlist",
    html,
  });
}

// ─── Slot available email ─────────────────────────────────────────────────────

export async function sendSlotAvailableEmail(opts: { to: string; swimmerName: string; tryoutName: string; signupLink: string }): Promise<void> {
  const html = `
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
                  <h1 style="margin:0;color:#ffffff;font-size:28px;">SwimTryout</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:40px 30px;color:#374151;">
                  <h2 style="margin-top:0;color:#111827;">A Spot is Available!</h2>

                  <p style="font-size:16px;line-height:24px;">Hello Parent/Guardian,</p>

                  <p style="font-size:16px;line-height:24px;">
                    Good news! A spot has become available for your swimmer <strong>${opts.swimmerName}</strong>'s
                    SwimTryout registration for <strong>${opts.tryoutName}</strong>.
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    You can now complete your signup using the link below:
                  </p>

                  <div style="text-align:center;margin:36px 0;">
                    <a
                      href="${opts.signupLink}"
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
                      Complete Your Registration
                    </a>
                  </div>

                  <p style="font-size:14px;line-height:22px;color:#6b7280;">
                    Or copy this link into your browser:<br/>
                    <a href="${opts.signupLink}" style="color:#2563eb;">${opts.signupLink}</a>
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    Please note that this opportunity is available on a first-come, first-served basis.
                    The spot will be reserved once the registration process is completed.
                  </p>

                  <p style="font-size:16px;line-height:24px;">
                    We look forward to welcoming your swimmer to the tryout!
                  </p>

                  <p style="font-size:16px;line-height:24px;margin-bottom:0;">
                    Best,<br/>
                    <strong>SwimTryout Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background:#f9fafb;padding:20px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#6b7280;font-size:13px;">
                    &copy; ${new Date().getFullYear()} SwimTryout. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  await sendMail({
    to: opts.to,
    subject: "A Spot is Available — Complete Your SwimTryout Signup",
    html,
  });
}

// ─── Bulk template email ──────────────────────────────────────────────────────

export interface BulkEmailRecipient {
  to: string;
  swimmer_name: string;
  parent_name: string;
  parent_email: string;
  club_name: string;
  tryout_name: string;
  group_name: string;
  sender_name: string;
}

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendBulkTemplateEmail(opts: {
  recipients: BulkEmailRecipient[];
  subjectTemplate: string;
  bodyTemplate: string;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  await Promise.all(
    opts.recipients.map(async (r) => {
      const vars: Record<string, string> = {
        swimmer_name: r.swimmer_name,
        parent_name: r.parent_name,
        parent_email: r.parent_email,
        club_name: r.club_name,
        tryout_name: r.tryout_name,
        group_name: r.group_name,
        sender_name: r.sender_name,
      };
      const subject = interpolateTemplate(opts.subjectTemplate, vars);
      const bodyText = interpolateTemplate(opts.bodyTemplate, vars);
      const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;max-width:600px;margin:0 auto;">${bodyText.replace(/\n/g, "<br/>")}</div>`;
      try {
        await sendMail({ to: r.to, subject, html, text: bodyText });
        sent++;
      } catch {
        failed++;
      }
    }),
  );

  return { sent, failed };
}
