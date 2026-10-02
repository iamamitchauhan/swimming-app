/**
 * Seed one registration per roster "case" for a tryout, so every validation
 * branch can be exercised in the UI (Add Score / Coach Recommendation rules).
 *
 * Usage: npx ts-node src/scripts/seed-tryout-cases.ts [tryoutId]
 * Default tryout id: 6abd7af7726a5cba2157765c
 *
 * Idempotent: swimmers are upserted on (parent, name, birthDate) and
 * registrations on (tryoutId, swimmerId), so re-running updates in place.
 * Existing registrations for the tryout are never deleted.
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { TryoutModel } from "../models/tryout.model";
import { TryoutSessionModel } from "../models/tryout-session.model";
import { TryoutSlotModel } from "../models/tryout-slot.model";
import { SwimmerModel } from "../models/swimmer.model";
import { RegistrationModel } from "../models/registration.model";
import { UserModel } from "../models/user.model";
import { GroupModel } from "../models/group.model";

const TRYOUT_ID = process.argv[2] ?? "6abd7af7726a5cba2157765c";

// A fixed "arrived at" moment so check-in timestamps are deterministic.
const CHECKED_IN_AT = new Date("2026-10-06T01:05:00.000Z");
const REJECTED_VALUE = "__rejected__";

type CaseDef = {
  firstName: string;
  lastName: string;
  age: number;
  status: "registered" | "waitlisted" | "offered" | "rejected" | "cancelled";
  checkedIn?: boolean;
  detailed?: Record<string, string | number | boolean | null>;
  strokeTotal?: number;
  coachRec?: "group" | "reject";
  note: string;
};

const DETAILED_SCORE: Record<string, string | number | boolean | null> = {
  circle_swim: "yes",
  ready_position: "yes",
  legs_straight: 3,
  legal_kick_fs: 4,
  didnt_finish: "no",
};

const CASES: CaseDef[] = [
  {
    firstName: "Case 01",
    lastName: "Registered - not checked in",
    age: 7,
    status: "registered",
    note: "Add Score hidden, Coach Rec hidden",
  },
  {
    firstName: "Case 02",
    lastName: "Registered - checked in, no score",
    age: 8,
    status: "registered",
    checkedIn: true,
    note: "Add Score shown, Coach Rec hidden",
  },
  {
    firstName: "Case 03",
    lastName: "Registered - checked in + detailed score",
    age: 9,
    status: "registered",
    checkedIn: true,
    detailed: DETAILED_SCORE,
    note: "Add Score + score + reset, Coach Rec editable",
  },
  {
    firstName: "Case 04",
    lastName: "Registered - checked in + stroke score only",
    age: 8,
    status: "registered",
    checkedIn: true,
    strokeTotal: 7,
    note: "hasScore via stroke total: Coach Rec editable, Evaluation still shows Add Score",
  },
  {
    firstName: "Case 05",
    lastName: "Rejected - no score",
    age: 7,
    status: "rejected",
    coachRec: "reject",
    note: "Add Score blocked, Coach Rec read-only 'Reject'",
  },
  {
    firstName: "Case 06",
    lastName: "Rejected - checked in + score",
    age: 10,
    status: "rejected",
    checkedIn: true,
    detailed: DETAILED_SCORE,
    coachRec: "reject",
    note: "Score shown read-only, Coach Rec read-only",
  },
  {
    firstName: "Case 07",
    lastName: "Cancelled - had check-in + score",
    age: 9,
    status: "cancelled",
    checkedIn: true,
    detailed: DETAILED_SCORE,
    coachRec: "group",
    note: "Everything hidden (Check-in, Add Score, Coach Rec, Offer/Reject)",
  },
  {
    firstName: "Case 08",
    lastName: "Waitlisted - checked in + score",
    age: 8,
    status: "waitlisted",
    checkedIn: true,
    detailed: DETAILED_SCORE,
    coachRec: "group",
    note: "Waitlisted → no actions (not part of the tryout until registered)",
  },
  {
    firstName: "Case 09",
    lastName: "Offered - checked in + score",
    age: 10,
    status: "offered",
    checkedIn: true,
    detailed: DETAILED_SCORE,
    coachRec: "group",
    note: "Add Score + Coach Rec allowed; Offer/Reject hidden (not registered)",
  },
  {
    firstName: "Case 10",
    lastName: "Registered - scored but not checked in",
    age: 9,
    status: "registered",
    detailed: DETAILED_SCORE,
    note: "Score read-only, Coach Rec hidden (un-checked after scoring)",
  },
  {
    firstName: "Case 11",
    lastName: "Waitlisted - not checked in",
    age: 7,
    status: "waitlisted",
    note: "Add Score hidden, Coach Rec hidden",
  },
];

async function main(): Promise<void> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  console.log("[seed-cases] connected");

  const tryout: any = await TryoutModel.findById(TRYOUT_ID).lean().exec();
  if (!tryout) throw new Error(`Tryout ${TRYOUT_ID} not found`);

  const segmentId = tryout.segments?.[0]?.name;
  if (!segmentId) throw new Error("Tryout has no segments");

  const session: any = await TryoutSessionModel.findOne({ tryoutId: TRYOUT_ID }).lean().exec();
  if (!session) throw new Error("Tryout has no sessions");
  const slots: any[] = await TryoutSlotModel.find({ tryoutId: TRYOUT_ID }).sort({ sessionDate: 1, slotIndex: 1 }).lean().exec();
  if (slots.length === 0) throw new Error("Tryout has no slots");

  // Reuse the parent that already has registrations for this tryout, else any parent.
  const existingReg: any = await RegistrationModel.findOne({ tryoutId: TRYOUT_ID }).lean().exec();
  const parent: any =
    (existingReg && (await UserModel.findById(existingReg.parentId).lean().exec())) || (await UserModel.findOne({ role: "parent" }).lean().exec());
  if (!parent) throw new Error("No parent user found to attach registrations to");
  const parentId = parent._id;

  // Optional group for the coach recommendation (null if the club has none).
  const group: any = await GroupModel.findOne({ clubId: tryout.clubId, deletedAt: null }).lean().exec();
  const groupId: string | null = group ? String(group._id) : null;

  console.log(`[seed-cases] tryout="${tryout.name}" segment="${segmentId}" slots=${slots.length}`);
  console.log(`[seed-cases] parent=${String(parentId)} (${parent.email}) group=${groupId ?? "none"}`);

  const results: Array<{ name: string; regId: string; status: string; note: string }> = [];

  for (const [i, c] of CASES.entries()) {
    const birthDate = new Date(2026 - c.age, 4, 10); // May 10
    const dob = `${birthDate.getFullYear()}-05-10`;
    const slot = slots[i % slots.length];

    const swimmer = await SwimmerModel.findOneAndUpdate(
      { parentId, firstName: c.firstName, lastName: c.lastName, birthDate },
      {
        $set: {
          parentId,
          firstName: c.firstName,
          lastName: c.lastName,
          birthDate,
          isActive: true,
          clubName: "Seed Club",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    const scores = c.strokeTotal
      ? { freestyle: c.strokeTotal, backstroke: c.strokeTotal, breaststroke: c.strokeTotal, butterfly: c.strokeTotal, totalScore: c.strokeTotal }
      : undefined;

    const update: Record<string, unknown> = {
      tryoutId: tryout._id,
      swimmerId: swimmer._id,
      parentId,
      sessionId: session._id,
      slotId: slot._id,
      segmentId,
      status: c.status,
      registeredAt: new Date("2026-09-20T10:00:00.000Z"),
      usaVerificationStatus: "pending",
      swimmerDetails: {
        firstName: c.firstName,
        lastName: c.lastName,
        dob,
        ageOnTryoutDay: c.age,
        hasUsaMembership: false,
        guardianName: "Seed Parent",
        guardianEmail: `seed.${c.firstName.toLowerCase().replace(/\s+/g, "")}@tryout-seed.test`,
      },
    };
    if (scores) update["scores"] = scores;
    if (c.detailed) update["detailedScores"] = c.detailed;
    if (c.coachRec === "reject") update["coachRecommendation"] = REJECTED_VALUE;
    else if (c.coachRec === "group" && groupId) update["coachRecommendation"] = groupId;

    if (c.checkedIn) {
      update["checkedInAt"] = CHECKED_IN_AT;
      update["checkedInBy"] = tryout.createdBy;
    } else {
      update["checkedInAt"] = null;
      update["checkedInBy"] = null;
    }

    const reg = await RegistrationModel.findOneAndUpdate(
      { tryoutId: tryout._id, swimmerId: swimmer._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    results.push({
      name: `${c.firstName} ${c.lastName}`,
      regId: String(reg!._id),
      status: c.status,
      note: c.note,
    });
  }

  console.log("\n[seed-cases] done — registrations:");
  for (const r of results) {
    console.log(`  ${r.regId}  ${r.status.padEnd(11)} ${r.name}  — ${r.note}`);
  }
  console.log(`\n[seed-cases] total registrations for tryout: ${await RegistrationModel.countDocuments({ tryoutId: TRYOUT_ID })}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed-cases] fatal:", err);
  process.exit(1);
});
