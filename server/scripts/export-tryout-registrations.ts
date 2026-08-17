import mongoose from "mongoose";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import path from "path";
import { RegistrationModel } from "../src/models/registration.model";
import { TryoutModel } from "../src/models/tryout.model";
import { SwimmerModel } from "../src/models/swimmer.model";
import { UserModel } from "../src/models/user.model";
import { TryoutSlotModel } from "../src/models/tryout-slot.model";

// Importing these registers their schemas with Mongoose so populate() can
// resolve the "Swimmer", "User", and "TryoutSlot" refs used by RegistrationModel.
void SwimmerModel;
void UserModel;
void TryoutSlotModel;

dotenv.config();

/**
 * Usage:
 *   npx ts-node scripts/export-tryout-registrations.ts <tryoutId>
 *
 * Exports every registration for the given tryout to an .xlsx file in the
 * server directory. The workbook contains a single sheet with one row per
 * registration and the following columns:
 *
 *   Registration ID, Swimmer First Name, Swimmer Last Name, Swimmer DOB,
 *   Age On Tryout Day, Segment ID, Slot Time, Parent Name, Parent Email, Status,
 *   Waitlist Position, Registered At, USA Membership, USA Membership ID,
 *   Club Name, USA Verification Status, Email Sent, Last Communication At,
 *   Created At, Updated At, plus one column per dynamic answer label,
 *   Total Score, per-stroke scores (Freestyle, Backstroke, Breaststroke,
 *   Butterfly, Safety EntryExit, SafetyFloat), one column per detailed-score
 *   criterion, Coach Recommendation, and Notes.
 *
 * Dynamic answer and detailed-score columns are added on the fly so every
 * answer/criterion is captured even if only some registrations have them.
 */

async function main(): Promise<void> {
  const tryoutId = process.argv[2];

  if (!tryoutId) {
    console.error("Usage: npx ts-node scripts/export-tryout-registrations.ts <tryoutId>");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);

    // Verify the tryout exists and grab its name for the output filename
    const tryout = await TryoutModel.findById(tryoutId).lean().exec();
    if (!tryout) {
      console.error(`Tryout not found with id: ${tryoutId}`);
      process.exit(1);
    }

    console.log(`Exporting registrations for tryout: ${tryout.name} (${tryoutId})`);

    // Fetch every registration for this tryout, populating the parent and slot
    // so we get the canonical parent name/email and slot time information.
    const registrations = await RegistrationModel.find({ tryoutId })
      .populate("swimmerId", "firstName lastName birthDate")
      .populate("parentId", "firstName lastName email")
      .populate("slotId", "sessionDate startTime endTime")
      .lean()
      .exec();

    if (registrations.length === 0) {
      console.log("No registrations found for this tryout. Nothing to export.");
      await mongoose.disconnect();
      return;
    }

    // Sort registrations in ascending order by slot time (date, then start, then end)
    registrations.sort((a, b) => {
      const slotA = (a as any).slotId ?? {};
      const slotB = (b as any).slotId ?? {};

      const dateA = slotA.sessionDate ?? "";
      const dateB = slotB.sessionDate ?? "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const startA = slotA.startTime ?? "";
      const startB = slotB.startTime ?? "";
      if (startA !== startB) return startA.localeCompare(startB);

      const endA = slotA.endTime ?? "";
      const endB = slotB.endTime ?? "";
      return endA.localeCompare(endB);
    });

    console.log(`Found ${registrations.length} registration(s). Building workbook…`);

    // Collect the full set of dynamic answer labels across all registrations
    // so we can build one column per question.
    const dynamicLabels: string[] = [];
    const seenLabels = new Set<string>();
    for (const reg of registrations) {
      const answers = (reg as any).dynamicAnswers ?? [];
      for (const ans of answers) {
        if (ans.label && !seenLabels.has(ans.label)) {
          seenLabels.add(ans.label);
          dynamicLabels.push(ans.label);
        }
      }
    }

    // Collect the full set of detailed-score criterion keys across all
    // registrations so we can build one column per criterion.
    const detailedKeys: string[] = [];
    const seenDetailed = new Set<string>();
    for (const reg of registrations) {
      const detailed = (reg as any).detailedScores ?? {};
      for (const key of Object.keys(detailed)) {
        if (!seenDetailed.has(key)) {
          seenDetailed.add(key);
          detailedKeys.push(key);
        }
      }
    }

    // ─── Build the workbook ────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Swimtryout Export Script";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Registrations");

    // Fixed columns (always present)
    const fixedColumns: Partial<ExcelJS.Column>[] = [
      { header: "Registration ID", key: "registrationId", width: 28 },
      { header: "Swimmer First Name", key: "swimmerFirstName", width: 18 },
      { header: "Swimmer Last Name", key: "swimmerLastName", width: 18 },
      { header: "Swimmer DOB", key: "swimmerDob", width: 14 },
      { header: "Age On Tryout Day", key: "ageOnTryoutDay", width: 14 },
      { header: "Segment ID", key: "segmentId", width: 24 },
      { header: "Slot Time", key: "slotTime", width: 30 },
      { header: "Parent Name", key: "parentName", width: 22 },
      { header: "Parent Email", key: "parentEmail", width: 28 },
      { header: "Status", key: "status", width: 14 },
      { header: "Waitlist Position", key: "waitlistPosition", width: 14 },
      { header: "Registered At", key: "registeredAt", width: 22 },
      { header: "USA Membership", key: "hasUsaMembership", width: 14 },
      { header: "USA Membership ID", key: "usaMembershipId", width: 18 },
      { header: "Club Name", key: "clubName", width: 18 },
      { header: "USA Verification Status", key: "usaVerificationStatus", width: 20 },
      { header: "Email Sent", key: "emailSent", width: 12 },
      { header: "Last Communication At", key: "lastCommunicationAt", width: 22 },
      { header: "Created At", key: "createdAt", width: 22 },
      { header: "Updated At", key: "updatedAt", width: 22 },
      {
        header: "Registration detail meta Answers",
        key: "registrationDetailMetaAnswers",
        width: 60,
      },
    ];

    // Dynamic answer columns (one per question label)
    const dynamicColumns: Partial<ExcelJS.Column>[] = dynamicLabels.map((label) => ({
      header: `Q: ${label}`,
      key: `dyn_${label}`,
      width: Math.max(20, Math.min(60, label.length + 8)),
    }));

    // Score columns (from the structured `scores` object on the registration)
    const scoreColumns: Partial<ExcelJS.Column>[] = [
      { header: "Total Score", key: "totalScore", width: 12 },
      { header: "Freestyle", key: "scoreFreestyle", width: 12 },
      { header: "Backstroke", key: "scoreBackstroke", width: 12 },
      { header: "Breaststroke", key: "scoreBreaststroke", width: 14 },
      { header: "Butterfly", key: "scoreButterfly", width: 12 },
      { header: "Safety Entry/Exit", key: "scoreSafetyEntryExit", width: 18 },
      { header: "Safety Float", key: "scoreSafetyFloat", width: 14 },
    ];

    // Detailed per-criterion score columns (one per criterion key)
    const detailedColumns: Partial<ExcelJS.Column>[] = detailedKeys.map((key) => ({
      header: `DS: ${key}`,
      key: `ds_${key}`,
      width: Math.max(16, Math.min(40, key.length + 8)),
    }));

    // Notes column
    const notesColumns: Partial<ExcelJS.Column>[] = [
      { header: "Coach Recommendation", key: "coachRecommendation", width: 24 },
      { header: "Notes", key: "notes", width: 40 },
    ];

    sheet.columns = [...fixedColumns, ...dynamicColumns, ...scoreColumns, ...detailedColumns, ...notesColumns];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };
    headerRow.height = 22;

    // Helper: format a value that may be a Date, string, array, or undefined
    function fmt(val: unknown): string {
      if (val === undefined || val === null) return "";
      if (val instanceof Date) return val.toISOString();
      if (Array.isArray(val)) return val.join(", ");
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    }

    // Populate rows
    for (const reg of registrations) {
      const swimmerDetails = (reg as any).swimmerDetails ?? {};
      const parent = (reg as any).parentId ?? {};
      const swimmer = (reg as any).swimmerId ?? {};
      const slot = (reg as any).slotId ?? {};

      // Prefer the populated parent document, fall back to swimmerDetails guardian
      const parentName =
        parent && (parent.firstName || parent.lastName)
          ? `${parent.firstName ?? ""} ${parent.lastName ?? ""}`.trim()
          : (swimmerDetails.guardianName ?? "");
      const parentEmail = parent?.email ?? swimmerDetails.guardianEmail ?? "";

      // Swimmer name: prefer swimmerDetails (captured at registration time),
      // fall back to the populated swimmer document.
      const swimmerFirstName = swimmerDetails.firstName ?? swimmer?.firstName ?? "";
      const swimmerLastName = swimmerDetails.lastName ?? swimmer?.lastName ?? "";
      const swimmerDob = swimmerDetails.dob ?? swimmer?.birthDate ?? "";

      // Format slot time as "sessionDate startTime to endTime"
      const slotTime = slot.sessionDate && slot.startTime && slot.endTime ? `${slot.sessionDate} ${slot.startTime} to ${slot.endTime}` : "";

      const row: Record<string, string | number | boolean> = {
        registrationId: (reg as any)._id?.toString() ?? "",
        swimmerFirstName,
        swimmerLastName,
        swimmerDob: fmt(swimmerDob),
        ageOnTryoutDay: swimmerDetails.ageOnTryoutDay ?? "",
        segmentId: (reg as any).segmentId ?? "",
        slotTime,
        parentName,
        parentEmail,
        status: (reg as any).status ?? "",
        waitlistPosition: (reg as any).waitlistPosition ?? "",
        registeredAt: fmt((reg as any).registeredAt),
        hasUsaMembership: swimmerDetails.hasUsaMembership ?? false,
        usaMembershipId: swimmerDetails.usaMembershipId ?? "",
        clubName: swimmerDetails.clubName ?? "",
        usaVerificationStatus: (reg as any).usaVerificationStatus ?? "",
        emailSent: (reg as any).emailSent ?? false,
        lastCommunicationAt: fmt((reg as any).lastCommunicationAt),
        createdAt: fmt((reg as any).createdAt),
        updatedAt: fmt((reg as any).updatedAt),
      };

      // Dynamic answers — aggregate every answer into a single readable
      // string for the "Registration detail meta Answers" column, and also
      // map each label to its own per-question column.
      const answers = (reg as any).dynamicAnswers ?? [];
      const metaParts: string[] = [];
      for (const ans of answers) {
        const key = `dyn_${ans.label}`;
        row[key] = fmt(ans.value);
        metaParts.push(`${ans.label}: ${fmt(ans.value)}`);
      }
      row.registrationDetailMetaAnswers = metaParts.join(" | ");

      // Structured scores
      const scores = (reg as any).scores ?? {};
      row.totalScore = scores.totalScore ?? "";
      row.scoreFreestyle = scores.freestyle ?? "";
      row.scoreBackstroke = scores.backstroke ?? "";
      row.scoreBreaststroke = scores.breaststroke ?? "";
      row.scoreButterfly = scores.butterfly ?? "";
      row.scoreSafetyEntryExit = scores.safetyEntryExit ?? "";
      row.scoreSafetyFloat = scores.safetyFloat ?? "";

      // Detailed per-criterion scores — one column per criterion key
      const detailed = (reg as any).detailedScores ?? {};
      for (const key of detailedKeys) {
        row[`ds_${key}`] = key in detailed ? fmt(detailed[key]) : "";
      }

      // Coach recommendation + notes
      row.coachRecommendation = fmt((reg as any).coachRecommendation);
      row.notes = (reg as any).notes ?? "";

      sheet.addRow(row);
    }

    // Auto-filter so the user can sort/filter in Excel
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: sheet.columnCount },
    };

    // Freeze the header row + the registration-id column for easy scrolling
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];

    // ─── Write the file ───────────────────────────────────────────────────
    const safeName = (tryout.name ?? "tryout")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/_+/g, "_")
      .slice(0, 60);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `registrations_${safeName}_${tryoutId}_${timestamp}.xlsx`;
    const outPath = path.resolve(process.cwd(), fileName);

    await workbook.xlsx.writeFile(outPath);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Export complete");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Tryout        : ${tryout.name}`);
    console.log(`  Tryout ID     : ${tryoutId}`);
    console.log(`  Registrations : ${registrations.length}`);
    console.log(`  Dynamic Qs    : ${dynamicLabels.length}`);
    console.log(`  Detailed keys : ${detailedKeys.length}`);
    console.log(`  Output file   : ${outPath}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

main();
