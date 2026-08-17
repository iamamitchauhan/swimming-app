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

export async function sendMail(options: MailOptions): Promise<string | undefined> {
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
    return info.messageId;
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, "email.send.failed");
    throw err;
  }
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Single source of truth for colors/spacing so every template renders identically.

const THEME = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryTint: "#eff6ff",
  primaryTintBorder: "#bfdbfe",
  success: "#16a34a",
  successDark: "#15803d",
  successTint: "#f0fdf4",
  successTintBorder: "#bbf7d0",
  danger: "#dc2626",
  dangerDark: "#991b1b",
  dangerText: "#7f1d1d",
  dangerTint: "#fef2f2",
  dangerTintBorder: "#fecaca",
  warningTint: "#fffbeb",
  warningTintBorder: "#fde68a",
  heading: "#111827",
  text: "#374151",
  muted: "#6b7280",
  border: "#e5e7eb",
  bgLight: "#f9fafb",
  bgPage: "#f4f7fb",
} as const;

const FONT_STACK = "Arial, Helvetica, sans-serif";

type AccentColor = "primary" | "success" | "danger";

const ACCENT: Record<AccentColor, { header: string; button: string }> = {
  primary: { header: THEME.primary, button: THEME.primary },
  success: { header: THEME.success, button: THEME.success },
  danger: { header: THEME.danger, button: THEME.primary },
};

// ─── Shared layout & components ──────────────────────────────────────────────
// Every template is built from these primitives so headers, footers, buttons,
// callouts, and tables always look and behave the same way.

/** Wraps inner content in the standard document shell (header + card + footer). */
export function renderLayout(opts: { accent?: AccentColor; bodyHtml: string; brandName?: string }): string {
  const accent = ACCENT[opts.accent ?? "primary"];
  const year = new Date().getFullYear();
  // Falls back to config.SES_FROM_NAME everywhere except the two templates
  // that originally hardcoded "SwimTryout" as their brand name — preserved
  // as-is via this optional override so output doesn't change.
  const brandName = opts.brandName ?? config.SES_FROM_NAME;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:${THEME.bgPage};font-family:${FONT_STACK};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${THEME.bgPage};padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:${accent.header};padding:30px;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                      ${brandName}
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;color:${THEME.text};font-size:15px;line-height:24px;">
                    ${opts.bodyHtml}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 30px;background:${THEME.bgLight};border-top:1px solid ${THEME.border};text-align:center;">
                    <p style="margin:0;font-size:13px;color:${THEME.muted};">
                      © ${year} ${brandName}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/** Large centered emoji/icon used at the top of status emails. */
function renderIcon(icon: string): string {
  return `<div style="text-align:center;margin-bottom:24px;"><div style="font-size:56px;">${icon}</div></div>`;
}

/** Standard page heading. */
function renderHeading(text: string, opts: { center?: boolean } = {}): string {
  return `<h2 style="margin-top:0;${opts.center ? "text-align:center;" : ""}color:${THEME.heading};">${text}</h2>`;
}

/** Call-to-action button. */
function renderButton(opts: { href: string; label: string; accent?: AccentColor }): string {
  const color = ACCENT[opts.accent ?? "primary"].button;
  return `
    <div style="text-align:center;margin:36px 0;">
      <a
        href="${opts.href}"
        style="
          background:${color};
          color:#ffffff;
          text-decoration:none;
          padding:14px 32px;
          border-radius:8px;
          font-size:16px;
          font-weight:600;
          display:inline-block;
        "
      >
        ${opts.label}
      </a>
    </div>
  `;
}

/** Plain-text fallback link box (for "button not working" cases). */
function renderLinkFallback(url: string): string {
  return `
    <p style="font-size:15px;line-height:24px;">
      If the button above does not work, copy and paste the following URL into your browser:
    </p>
    <p style="
      word-break:break-all;
      background:${THEME.bgLight};
      border:1px solid ${THEME.border};
      padding:12px;
      border-radius:6px;
      font-size:13px;
      color:#4b5563;
    ">
      ${url}
    </p>
  `;
}

/** Single-value highlight card (e.g. a club name, swimmer name, OTP). */
function renderHighlightCard(opts: { label: string; value: string; accent?: AccentColor }): string {
  const palette: Record<AccentColor, { bg: string; border: string; text: string }> = {
    primary: { bg: THEME.bgLight, border: THEME.border, text: THEME.heading },
    success: { bg: THEME.successTint, border: THEME.successTintBorder, text: THEME.successDark },
    danger: { bg: THEME.dangerTint, border: THEME.dangerTintBorder, text: THEME.dangerDark },
  };
  const p = palette[opts.accent ?? "primary"];
  return `
    <div style="
      margin:30px 0;
      padding:24px;
      background:${p.bg};
      border:1px solid ${p.border};
      border-radius:10px;
      text-align:center;
    ">
      <p style="margin:0;font-size:14px;color:${THEME.muted};">${opts.label}</p>
      <p style="margin:10px 0 0;font-size:24px;font-weight:700;color:${p.text};">${opts.value}</p>
    </div>
  `;
}

/** Two-column label/value details table (tryout details, invitation details, etc.). */
function renderDetailsTable(rows: Array<{ label: string; value: string }>, opts: { title?: string } = {}): string {
  const titleRow = opts.title
    ? `<tr><td colspan="2" style="padding:14px 20px;background:${THEME.bgLight};font-weight:bold;">${opts.title}</td></tr>`
    : "";
  const dataRows = rows
    .map(
      (row, i) => `
      <tr>
        <td style="padding:14px 20px;${i > 0 || opts.title ? `border-top:1px solid ${THEME.border};` : ""}font-weight:600;width:35%;">
          ${row.label}
        </td>
        <td style="padding:14px 20px;${i > 0 || opts.title ? `border-top:1px solid ${THEME.border};` : ""}">
          ${row.value}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border:1px solid ${THEME.border};border-radius:8px;overflow:hidden;">
      ${titleRow}
      ${dataRows}
    </table>
  `;
}

/** Colored callout/notice box (reason for rejection, reminders, next steps, etc.). */
function renderCallout(opts: { title?: string; content: string; tone?: "info" | "success" | "danger" | "warning" }): string {
  const palette = {
    info: { bg: THEME.bgLight, border: THEME.border, titleColor: THEME.heading },
    success: { bg: THEME.successTint, border: THEME.successTintBorder, titleColor: THEME.successDark },
    danger: { bg: THEME.dangerTint, border: THEME.dangerTintBorder, titleColor: THEME.dangerDark },
    warning: { bg: THEME.warningTint, border: THEME.warningTintBorder, titleColor: THEME.heading },
  }[opts.tone ?? "info"];

  const titleHtml = opts.title ? `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${palette.titleColor};">${opts.title}</p>` : "";

  return `
    <div style="margin:24px 0;background:${palette.bg};border:1px solid ${palette.border};border-radius:10px;padding:20px;">
      ${titleHtml}
      <div style="margin:0;font-size:15px;line-height:24px;color:${THEME.text};">${opts.content}</div>
    </div>
  `;
}

/** Standard sign-off used across the swim-tryout templates. */
function renderSignOff(clubName: string): string {
  return `
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      Best regards,<br />
      Justin Bilgri<br />
      Bilgrij@friscoisd.org<br />
      ${clubName}
    </p>
  `;
}

// ─── Email templates ─────────────────────────────────────────────────────────

export async function sendEmailVerification(opts: { to: string; verifyUrl: string }): Promise<void> {
  const bodyHtml = `
    ${renderHeading(`Welcome to ${config.SES_FROM_NAME}!`)}
    <p style="font-size:16px;line-height:24px;">
      Thank you for creating an account. To complete your registration and start using ${config.SES_FROM_NAME}, please verify your email address.
    </p>
    ${renderButton({ href: opts.verifyUrl, label: "Verify Email Address" })}
    <p style="font-size:15px;line-height:24px;">
      This verification link will expire in <strong>24 hours</strong>.
    </p>
    ${renderLinkFallback(opts.verifyUrl)}
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      If you did not create an account with ${config.SES_FROM_NAME}, you can safely ignore this email.
    </p>
  `;

  await sendMail({
    to: opts.to,
    subject: `Verify Your Email Address | ${config.SES_FROM_NAME}`,
    html: renderLayout({ bodyHtml }),
  });
}

export async function sendOtp(opts: { to: string; otp: string }): Promise<void> {
  const otpBlock = `
    <div style="text-align:center;margin:32px 0;">
      <div style="
        display:inline-block;
        background:${THEME.primaryTint};
        color:${THEME.primary};
        font-size:42px;
        font-weight:700;
        letter-spacing:10px;
        padding:20px 30px;
        border-radius:10px;
        border:2px dashed ${THEME.primaryTintBorder};
      ">
        ${opts.otp}
      </div>
    </div>
  `;

  const bodyHtml = `
    ${renderHeading("Verify Your Login")}
    <p style="font-size:16px;line-height:24px;margin-bottom:24px;">
      Use the One-Time Password (OTP) below to securely log in to your account.
    </p>
    ${otpBlock}
    <p style="font-size:15px;line-height:24px;">
      This OTP is valid for <strong>10 minutes</strong>.
    </p>
    <p style="font-size:15px;line-height:24px;">
      For your security, never share this code with anyone.
    </p>
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      If you did not request this login, you can safely ignore this email.
    </p>
  `;

  await sendMail({
    to: opts.to,
    subject: `Your Login OTP: ${opts.otp} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ bodyHtml }),
  });
}

export async function sendClubSubmittedNotification(opts: { to: string; clubName: string; dashboardUrl?: string }): Promise<void> {
  const bodyHtml = `
    ${renderHeading("New Club Application Received")}
    <p style="font-size:16px;line-height:24px;">
      A new club application has been submitted and is awaiting review.
    </p>
    ${renderHighlightCard({ label: "Club Name", value: opts.clubName })}
    <p style="font-size:15px;line-height:24px;">
      Please log in to the admin dashboard to review the application and take the appropriate action.
    </p>
    ${opts.dashboardUrl ? renderButton({ href: opts.dashboardUrl, label: "Review Application" }) : ""}
  `;

  await sendMail({
    to: opts.to,
    subject: `New Club Application: ${opts.clubName} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ bodyHtml }),
  });
}

export async function sendClubApproved(opts: { to: string; clubName: string; loginUrl?: string }): Promise<void> {
  const bodyHtml = `
    ${renderIcon("🎉")}
    ${renderHeading("Congratulations!", { center: true })}
    <p style="font-size:16px;line-height:24px;text-align:center;">
      Your club application has been reviewed and approved.
    </p>
    ${renderHighlightCard({ label: "Approved Club", value: opts.clubName, accent: "success" })}
    <p style="font-size:15px;line-height:24px;">
      Your club is now active on ${config.SES_FROM_NAME} and ready to use.
    </p>
    <p style="font-size:15px;line-height:24px;">
      You can now log in to your account and start managing your club, members, events, and activities.
    </p>
    ${opts.loginUrl ? renderButton({ href: opts.loginUrl, label: "Go to Dashboard", accent: "success" }) : ""}
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      Thank you for joining ${config.SES_FROM_NAME}. We're excited to have your club as part of our community.
    </p>
  `;

  await sendMail({
    to: opts.to,
    subject: `Club Approved: ${opts.clubName} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ accent: "success", bodyHtml }),
  });
}

export async function sendClubRejected(opts: { to: string; clubName: string; reason: string; supportEmail?: string }): Promise<void> {
  const bodyHtml = `
    ${renderIcon("📋")}
    ${renderHeading("Club Application Update", { center: true })}
    <p style="font-size:16px;line-height:24px;text-align:center;">
      Thank you for your interest in joining ${config.SES_FROM_NAME}.
    </p>
    <p style="font-size:16px;line-height:24px;">
      After reviewing your application, we are unable to approve the registration for the club below at this time.
    </p>
    ${renderHighlightCard({ label: "Club Name", value: opts.clubName })}
    ${renderCallout({ title: "Reason", content: opts.reason, tone: "danger" })}
    <p style="font-size:15px;line-height:24px;">
      You may review the information provided in your application and submit an updated application if applicable.
    </p>
    <p style="font-size:15px;line-height:24px;">
      If you believe this decision was made in error or need further clarification, please contact our support team.
    </p>
    ${opts.supportEmail ? renderButton({ href: `mailto:${opts.supportEmail}`, label: "Contact Support" }) : ""}
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      We appreciate your interest in ${config.SES_FROM_NAME} and encourage you to apply again after addressing the concerns noted above.
    </p>
  `;

  await sendMail({
    to: opts.to,
    subject: `Club Application Update: ${opts.clubName} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ accent: "danger", bodyHtml }),
  });
}

export async function sendInvitation(opts: { to: string; inviterName: string; clubName: string; role: string; acceptUrl: string }): Promise<void> {
  const bodyHtml = `
    ${renderIcon("🏊")}
    ${renderHeading("You're Invited!", { center: true })}
    <p style="font-size:16px;line-height:24px;text-align:center;">
      You have received an invitation to join a club on ${config.SES_FROM_NAME}.
    </p>
    ${renderDetailsTable([
      { label: "Invited By", value: opts.inviterName },
      { label: "Club", value: opts.clubName },
      { label: "Role", value: `<span style="color:${THEME.primary};font-weight:600;">${opts.role}</span>` },
    ])}
    <p style="font-size:15px;line-height:24px;">
      By accepting this invitation, you'll gain access to the club and be able to perform actions according to your assigned role.
    </p>
    ${renderButton({ href: opts.acceptUrl, label: "Accept Invitation" })}
    <p style="font-size:15px;line-height:24px;">
      This invitation will expire in <strong>48 hours</strong>.
    </p>
    ${renderLinkFallback(opts.acceptUrl)}
    <p style="font-size:15px;line-height:24px;margin-top:30px;">
      If you were not expecting this invitation, you can safely ignore this email.
    </p>
  `;

  await sendMail({
    to: opts.to,
    subject: `Invitation to Join ${opts.clubName} as ${opts.role} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ bodyHtml }),
  });
}

export interface SentEmailResult {
  subject: string;
  body: string;
  html: string;
  messageId?: string;
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
  clubName: string;
}): Promise<SentEmailResult> {
  const subject = `Congratulations — Team Spot Offered`;
  const bodyHtml = `
    <p style="font-size:15px;line-height:24px;">Hi ${opts.parentName},</p>
    <p style="font-size:15px;line-height:24px;">
      We are excited to share that <strong>${opts.swimmerName}</strong> has been offered a spot on our swim team following their tryout evaluation.
    </p>
    <p style="font-size:15px;line-height:24px;">
      Our coaching team was impressed by <strong>${opts.swimmerName}</strong>'s skills, effort, and potential, and we look forward to welcoming them to the team.
    </p>
    ${renderDetailsTable(
      [
        { label: "Tryout", value: opts.tryoutName },
        { label: "Date", value: opts.sessionDate },
        { label: "Location", value: opts.location },
      ],
      { title: "📋 Tryout Details" },
    )}
    ${renderCallout({
      title: "What's Next?",
      tone: "info",
      content: `
        <p style="margin:0;font-size:14px;line-height:22px;">You will receive another email shortly with a link to complete the team registration process.</p>
        <p style="margin:12px 0 0;font-size:14px;line-height:22px;">That email will include important details such as practice schedule, start date, team information, and next steps to get started.</p>
      `,
    })}
    <p style="font-size:15px;line-height:24px;">
      We are excited to support <strong>${opts.swimmerName}</strong>'s continued growth, confidence, and success in swimming.
    </p>
    ${renderSignOff(opts.clubName)}
  `;
  const html = renderLayout({ accent: "success", bodyHtml });
  const messageId = await sendMail({ to: opts.to, subject, html });
  return { subject, body: bodyHtml.replace(/<[^>]*>/g, ""), html, messageId };
}

export async function sendRegistrationReject(opts: {
  to: string;
  swimmerName: string;
  parentName: string;
  tryoutName: string;
  sessionDate: string;
  clubName: string;
}): Promise<SentEmailResult> {
  const subject = `Tryout Result for ${opts.swimmerName} | ${config.SES_FROM_NAME}`;
  const bodyHtml = `
    ${renderIcon("📋")}
    ${renderHeading("Tryout Evaluation Update", { center: true })}
    <p style="font-size:15px;line-height:24px;">Hi ${opts.parentName},</p>
    ${renderHighlightCard({ label: "Swimmer", value: opts.swimmerName, accent: "danger" })}
    <p style="font-size:15px;line-height:24px;">
      Thank you for bringing <strong>${opts.swimmerName}</strong> to our swimming tryout and for giving our coaching team the opportunity to meet them.
    </p>
    <p style="font-size:15px;line-height:24px;">
      After reviewing the tryout evaluation, we have decided not to offer a team spot at this time.
    </p>
    <p style="font-size:15px;line-height:24px;">
      We appreciate the effort and enthusiasm <strong>${opts.swimmerName}</strong> showed during the evaluation. Swimming development takes time, and we encourage <strong>${opts.swimmerName}</strong> to continue practicing and building their skills.
    </p>
    ${renderDetailsTable(
      [
        { label: "Swimmer", value: opts.swimmerName },
        { label: "Tryout", value: opts.tryoutName },
        { label: "Date", value: opts.sessionDate },
      ],
      { title: "📋 Tryout Details" },
    )}
    ${renderCallout({
      tone: "warning",
      content: `<p style="margin:0;font-size:14px;line-height:22px;">We wish <strong>${opts.swimmerName}</strong> continued success in their swimming journey and hope to see them again in the future.</p>`,
    })}
    ${renderSignOff(opts.clubName)}
  `;
  const html = renderLayout({ accent: "danger", bodyHtml });
  const messageId = await sendMail({ to: opts.to, subject, html });
  return { subject, body: bodyHtml.replace(/<[^>]*>/g, ""), html, messageId };
}

export async function sendRegistrationReceivedEmail(opts: {
  to: string;
  parentName: string;
  swimmerName: string;
  tryoutName: string;
  location: string;
  slotLabel: string;
  clubName: string;
}): Promise<any> {
  const bodyHtml = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">🏊</div>
      <h2 style="margin:16px 0 8px;color:${THEME.heading};">Tryout Registration Confirmed</h2>
      <p style="margin:0;font-size:15px;line-height:24px;color:${THEME.muted};">
        Thank you for registering for a swimming tryout. We look forward to seeing you soon.
      </p>
    </div>
    <p style="font-size:15px;line-height:24px;">Hi ${opts.parentName},</p>
    <p style="font-size:15px;line-height:24px;">
      Your swimmer, <strong>${opts.swimmerName}</strong>, has been successfully registered for the following tryout.
    </p>
    ${renderDetailsTable(
      [
        { label: "Swimmer", value: opts.swimmerName },
        { label: "Tryout", value: opts.tryoutName },
        { label: "Date & Time", value: opts.slotLabel },
        { label: "Location", value: opts.location },
      ],
      { title: "Tryout Details" },
    )}
    ${renderCallout({
      title: "Before you arrive",
      tone: "info",
      content: `
        <ul style="margin:0 0 0 18px;padding:0;color:${THEME.muted};font-size:14px;line-height:22px;">
          <li>Please arrive 10 minutes early for check-in.</li>
          <li>Bring swimwear, goggles, and any required swim equipment.</li>
        </ul>
      `,
    })}
    <p style="font-size:15px;line-height:24px;">
      If you have any questions before the tryout, feel free to contact us.
    </p>
    ${renderSignOff(opts.clubName)}
  `;

  await sendMail({
    to: opts.to,
    subject: `Registration Received: ${opts.tryoutName} | ${config.SES_FROM_NAME}`,
    html: renderLayout({ bodyHtml }),
  });
}

// ─── Waitlist confirmation email ─────────────────────────────────────────────

export async function sendWaitlistConfirmationEmail(opts: {
  to: string;
  parentName: string;
  swimmerName: string;
  tryoutName: string;
  clubName: string;
}): Promise<void> {
  const bodyHtml = `
    ${renderHeading("You're on the Waitlist!")}
    <p style="font-size:16px;line-height:24px;">Hi ${opts.parentName},</p>
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
    ${renderSignOff(opts.clubName)}
  `;

  await sendMail({
    to: opts.to,
    subject: "Your SwimTryout Registration is on the Waitlist",
    html: renderLayout({ bodyHtml }),
  });
}

// ─── Slot available email ─────────────────────────────────────────────────────

export async function sendSlotAvailableEmail(opts: {
  to: string;
  parentName: string;
  swimmerName: string;
  tryoutName: string;
  signupLink: string;
  clubName: string;
}): Promise<void> {
  const bodyHtml = `
    ${renderHeading("A Spot is Available!")}
    <p style="font-size:16px;line-height:24px;">Hi ${opts.parentName},</p>
    <p style="font-size:16px;line-height:24px;">
      Good news! A spot has become available for your swimmer <strong>${opts.swimmerName}</strong>'s
      SwimTryout registration for <strong>${opts.tryoutName}</strong>.
    </p>
    <p style="font-size:16px;line-height:24px;">
      You can now complete your signup using the link below:
    </p>
    ${renderButton({ href: opts.signupLink, label: "Complete Your Registration", accent: "success" })}
    <p style="font-size:14px;line-height:22px;color:${THEME.muted};">
      Or copy this link into your browser:<br/>
      <a href="${opts.signupLink}" style="color:${THEME.primary};">${opts.signupLink}</a>
    </p>
    <p style="font-size:16px;line-height:24px;">
      Please note that this opportunity is available on a first-come, first-served basis.
      The spot will be reserved once the registration process is completed.
    </p>
    <p style="font-size:16px;line-height:24px;">
      We look forward to welcoming your swimmer to the tryout!
    </p>
    ${renderSignOff(opts.clubName)}
  `;

  await sendMail({
    to: opts.to,
    subject: "A Spot is Available — Complete Your SwimTryout Signup",
    html: renderLayout({ accent: "success", bodyHtml }),
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
  note: string;
  registrationId?: string;
}

/**
 * Optional context for writing one audit-log row per recipient inside
 * `sendBulkTemplateEmail`. When provided, a row is written to the
 * `email_audit_logs` collection for every send attempt (sent or failed).
 * Audit writes are wrapped in their own try/catch so a logging failure
 * never breaks the email flow.
 */
export interface BulkEmailAuditContext {
  clubId: string;
  tryoutId: string;
  action: "offered" | "rejected";
  mode: "single" | "bulk";
  templateType: "custom" | "default";
  senderId?: string;
  senderName?: string;
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * Renders a templated email exactly as sendBulkTemplateEmail would, but
 * WITHOUT sending. Returns the interpolated subject, plain-text body, and
 * full HTML (wrapped in renderLayout) so the client can show a faithful
 * preview of what will actually be sent.
 */
export function previewTemplateEmail(opts: { recipient: BulkEmailRecipient; subjectTemplate: string; bodyTemplate: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const r = opts.recipient;
  const vars: Record<string, string> = {
    swimmer_name: r.swimmer_name,
    parent_name: r.parent_name,
    parent_email: r.parent_email,
    club_name: r.club_name,
    tryout_name: r.tryout_name,
    group_name: r.group_name,
    sender_name: r.sender_name,
    note: r.note,
  };
  const subject = interpolateTemplate(opts.subjectTemplate, vars);
  const bodyText = interpolateTemplate(opts.bodyTemplate, vars);
  const bodyHtml = `<div style="font-size:15px;line-height:24px;color:${THEME.text};">${bodyText.replace(/\n/g, "<br/>")}</div>`;
  const html = renderLayout({ bodyHtml });
  return { subject, text: bodyText, html };
}

export async function sendBulkTemplateEmail(opts: {
  recipients: BulkEmailRecipient[];
  subjectTemplate: string;
  bodyTemplate: string;
  auditContext?: BulkEmailAuditContext;
}): Promise<{ sent: number; failed: number; sentRegistrationIds: string[]; failedRegistrationIds: string[] }> {
  let sent = 0;
  let failed = 0;
  const sentRegistrationIds: string[] = [];
  const failedRegistrationIds: string[] = [];

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
        note: r.note,
      };
      const subject = interpolateTemplate(opts.subjectTemplate, vars);
      const bodyText = interpolateTemplate(opts.bodyTemplate, vars);
      const bodyHtml = `<div style="font-size:15px;line-height:24px;color:${THEME.text};">${bodyText.replace(/\n/g, "<br/>")}</div>`;
      const html = renderLayout({ bodyHtml });
      let status: "sent" | "failed" = "sent";
      let errorMessage: string | undefined;
      let messageId: string | undefined;
      try {
        messageId = await sendMail({ to: r.to, subject, html, text: bodyText });
        sent++;
        if (r.registrationId) sentRegistrationIds.push(r.registrationId);
      } catch (err: any) {
        failed++;
        status = "failed";
        errorMessage = err?.message ?? String(err);
        if (r.registrationId) failedRegistrationIds.push(r.registrationId);
      }

      // ── Audit log (best-effort) ────────────────────────────────────────────
      if (opts.auditContext) {
        try {
          // Lazy import to avoid a hard circular dependency at module load time.
          const { EmailAuditLogModel } = await import("../../models/email-audit-log.model");
          await EmailAuditLogModel.create({
            clubId: opts.auditContext.clubId,
            tryoutId: opts.auditContext.tryoutId,
            registrationId: r.registrationId,
            recipientEmail: r.to,
            swimmerName: r.swimmer_name,
            parentName: r.parent_name,
            action: opts.auditContext.action,
            mode: opts.auditContext.mode,
            templateType: opts.auditContext.templateType,
            subject,
            body: bodyText,
            html,
            status,
            errorMessage,
            messageId,
            senderId: opts.auditContext.senderId,
            senderName: opts.auditContext.senderName,
            sentAt: new Date(),
          });
        } catch (auditErr) {
          logger.error({ err: auditErr, recipient: r.to, subject }, "email.audit_log.write_failed");
        }
      }
    }),
  );

  return { sent, failed, sentRegistrationIds, failedRegistrationIds };
}
