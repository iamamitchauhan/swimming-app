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
    subject: 'Verify your email — Swimming App',
    html: `
      <h2>Welcome to Swimming App</h2>
      <p>Please verify your email address to get started.</p>
      <p>
        <a href="${opts.verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
      </p>
      <p>This link expires in 24 hours.</p>
      <p>If you did not register, you can safely ignore this email.</p>
    `,
  });
}

export async function sendOtp(opts: {
  to: string;
  otp: string;
}): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: 'Your login OTP — Swimming App',
    html: `
      <h2>Your One-Time Password</h2>
      <p>Use the following 6-digit OTP to log in:</p>
      <h1 style="letter-spacing:8px;font-size:48px;color:#2563eb;">${opts.otp}</h1>
      <p>This OTP expires in 10 minutes. Do not share it with anyone.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
}

export async function sendClubSubmittedNotification(opts: {
  to: string;
  clubName: string;
}): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: 'New Club Application — Swimming App',
    html: `
      <h2>New Club Application Received</h2>
      <p>A new club application has been submitted and is pending your review.</p>
      <p><strong>Club Name:</strong> ${opts.clubName}</p>
      <p>Please log in to the admin dashboard to review the application.</p>
    `,
  });
}

export async function sendClubApproved(opts: {
  to: string;
  clubName: string;
}): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: 'Your club has been approved — Swimming App',
    html: `
      <h2>Congratulations! Your club has been approved.</h2>
      <p><strong>${opts.clubName}</strong> is now active on Swimming App.</p>
      <p>You can log in and start managing your club.</p>
    `,
  });
}

export async function sendClubRejected(opts: {
  to: string;
  clubName: string;
  reason: string;
}): Promise<void> {
  await sendMail({
    to: opts.to,
    subject: 'Club application update — Swimming App',
    html: `
      <h2>Your club application was not approved</h2>
      <p>We reviewed your application for <strong>${opts.clubName}</strong> and were unable to approve it at this time.</p>
      <p><strong>Reason:</strong> ${opts.reason}</p>
      <p>If you have questions, please contact support.</p>
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
    subject: `You've been invited to join ${opts.clubName} — Swimming App`,
    html: `
      <h2>You've been invited!</h2>
      <p><strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.clubName}</strong> as a <strong>${opts.role}</strong>.</p>
      <p>
        <a href="${opts.acceptUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Accept Invitation
        </a>
      </p>
      <p>This invitation expires in 48 hours.</p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  });
}
