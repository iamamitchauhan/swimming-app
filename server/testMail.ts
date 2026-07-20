/**
 * test-emails.ts
 *
 * Sends every email template in mailer.ts to a single test address so you can
 * visually verify subject lines, styling, and content end-to-end (through
 * real SES) instead of just the local HTML preview.
 *
 * SETUP
 *   1. Place this file next to (or import-path-adjacent to) your mailer.ts,
 *      e.g. src/utils/test-emails.ts if mailer.ts lives in src/utils/.
 *   2. Adjust the import path below (`./mailer`) if your file layout differs.
 *   3. Make sure your .env / config has valid AWS SES credentials and that
 *      SES_FROM_EMAIL is verified (or you're still in the SES sandbox and
 *      TEST_EMAIL below is also a verified address).
 *
 * RUN
 *   npx ts-node test-emails.ts you@example.com
 *   # or, if you don't use ts-node:
 *   npx tsc test-emails.ts --outDir dist --esModuleInterop && node dist/test-emails.js you@example.com
 *
 * FLAGS
 *   --only=<names>   Comma-separated list of test names to run (see TESTS below).
 *   --delay=<ms>     Delay between sends in ms (default 1500, helps avoid SES rate limits).
 */

import * as mailer from "./src/shared/utils/mailer";

const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL;

if (!TEST_EMAIL) {
  console.error("❌ No test email provided.\n\nUsage: npx ts-node test-emails.ts you@example.com");
  process.exit(1);
}

const args = process.argv.slice(3);
const onlyArg = args.find((a) => a.startsWith("--only="));
const delayArg = args.find((a) => a.startsWith("--delay="));
const only = onlyArg
  ? onlyArg
      .replace("--only=", "")
      .split(",")
      .map((s) => s.trim())
  : null;
const delayMs = delayArg ? parseInt(delayArg.replace("--delay=", ""), 10) : 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Sample data for every template ──────────────────────────────────────────
// One entry per exported email function. Edit the sample payloads if your
// real function signatures differ from what's captured here.

const TESTS: Array<{ name: string; run: () => Promise<unknown> }> = [
  {
    name: "email-verification",
    run: () =>
      mailer.sendEmailVerification({
        to: TEST_EMAIL!,
        verifyUrl: "https://example.com/verify/test-token-123",
      }),
  },
  {
    name: "otp",
    run: () =>
      mailer.sendOtp({
        to: TEST_EMAIL!,
        otp: "482913",
      }),
  },
  {
    name: "club-submitted",
    run: () =>
      mailer.sendClubSubmittedNotification({
        to: TEST_EMAIL!,
        clubName: "Riverside Aquatics",
        dashboardUrl: "https://example.com/admin/clubs/riverside-aquatics",
      }),
  },
  {
    name: "club-approved",
    run: () =>
      mailer.sendClubApproved({
        to: TEST_EMAIL!,
        clubName: "Riverside Aquatics",
        loginUrl: "https://example.com/login",
      }),
  },
  {
    name: "club-rejected",
    run: () =>
      mailer.sendClubRejected({
        to: TEST_EMAIL!,
        clubName: "Riverside Aquatics",
        reason: "Missing required USA Swimming club affiliation number.",
        supportEmail: "support@example.com",
      }),
  },
  {
    name: "invitation",
    run: () =>
      mailer.sendInvitation({
        to: TEST_EMAIL!,
        inviterName: "Jamie Lee",
        clubName: "Riverside Aquatics",
        role: "Coach",
        acceptUrl: "https://example.com/invite/test-token-456",
      }),
  },
  {
    name: "registration-offer",
    run: () =>
      mailer.sendRegistrationOffer({
        to: TEST_EMAIL!,
        swimmerName: "Ava Thompson",
        parentName: "Marcus Thompson",
        tryoutName: "Fall Tryouts 2026",
        location: "Central Aquatic Center",
        sessionDate: "August 3, 2026",
        startTime: "9:00 AM",
        endTime: "10:30 AM",
        clubName: "Riverside Aquatics",
      }),
  },
  {
    name: "registration-reject",
    run: () =>
      mailer.sendRegistrationReject({
        to: TEST_EMAIL!,
        swimmerName: "Noah Kim",
        parentName: "Grace Kim",
        tryoutName: "Fall Tryouts 2026",
        sessionDate: "August 3, 2026",
        clubName: "Riverside Aquatics",
      }),
  },
  {
    name: "registration-received",
    run: () =>
      mailer.sendRegistrationReceivedEmail({
        to: TEST_EMAIL!,
        parentName: "Priya Nair",
        swimmerName: "Aria Nair",
        tryoutName: "Fall Tryouts 2026",
        location: "Central Aquatic Center",
        slotLabel: "August 3, 2026, 9:00 - 10:30 AM",
        clubName: "Riverside Aquatics",
      }),
  },
  {
    name: "waitlist-confirmation",
    run: () =>
      mailer.sendWaitlistConfirmationEmail({
        to: TEST_EMAIL!,
        parentName: "Diego Alvarez",
        swimmerName: "Mateo Alvarez",
        tryoutName: "Fall Tryouts 2026",
        clubName: "Riverside Aquatics",
      }),
  },
  {
    name: "slot-available",
    run: () =>
      mailer.sendSlotAvailableEmail({
        to: TEST_EMAIL!,
        parentName: "Diego Alvarez",
        swimmerName: "Mateo Alvarez",
        tryoutName: "Fall Tryouts 2026",
        signupLink: "https://example.com/signup/slot-test-789",
        clubName: "Riverside Aquatics",
      }),
  },
  {
    name: "bulk-template",
    run: () =>
      mailer.sendBulkTemplateEmail({
        recipients: [
          {
            to: TEST_EMAIL!,
            swimmer_name: "Ava Thompson",
            parent_name: "Marcus Thompson",
            parent_email: TEST_EMAIL!,
            club_name: "Riverside Aquatics",
            tryout_name: "Fall Tryouts 2026",
            group_name: "Senior Group",
            sender_name: "Jamie Lee",
          },
        ],
        subjectTemplate: "Update for {{swimmer_name}}",
        bodyTemplate: "Hi {{parent_name}},\n\nJust a note about {{swimmer_name}}'s upcoming session with {{group_name}}.\n\n— {{sender_name}}",
      }),
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  const toRun = only ? TESTS.filter((t) => only.includes(t.name)) : TESTS;

  if (toRun.length === 0) {
    console.error(`❌ No matching tests for --only=${only?.join(",")}`);
    console.error(`Available: ${TESTS.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`📧 Sending ${toRun.length} test email(s) to ${TEST_EMAIL}\n`);

  const results: Array<{ name: string; ok: boolean; error?: string }> = [];

  for (const test of toRun) {
    process.stdout.write(`  → ${test.name} ... `);
    try {
      await test.run();
      console.log("✅ sent");
      results.push({ name: test.name, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌ failed (${message})`);
      results.push({ name: test.name, ok: false, error: message });
    }
    await sleep(delayMs);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log(`\n──────────────────────────────`);
  console.log(`Done: ${passed}/${results.length} sent successfully.`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.map((f) => f.name).join(", ")}`);
    process.exitCode = 1;
  }
}

main();
