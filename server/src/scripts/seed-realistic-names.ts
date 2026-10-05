/**
 * Seed realistic-name registrations (status "registered") for a tryout.
 *
 * Usage: npx ts-node src/scripts/seed-realistic-names.ts [tryoutId]
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

const TRYOUT_ID = process.argv[2] ?? "6abd7af7726a5cba2157765c";

type NameDef = {
  firstName: string;
  lastName: string;
  age: number;
};

const NAMES: NameDef[] = [
  { firstName: "Michael", lastName: "Torres", age: 10 },
  { firstName: "Sarah", lastName: "Bennett", age: 9 },
  { firstName: "Daniel", lastName: "Cooper", age: 8 },
  { firstName: "Rachel", lastName: "Simmons", age: 10 },
  { firstName: "Jonathan", lastName: "Pierce", age: 11 },
  { firstName: "Amanda", lastName: "Whitfield", age: 9 },
  { firstName: "Christopher", lastName: "Hayes", age: 12 },
];

async function main(): Promise<void> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  console.log("[seed-names] connected");

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

  console.log(`[seed-names] tryout="${tryout.name}" segment="${segmentId}" slots=${slots.length}`);
  console.log(`[seed-names] parent=${String(parentId)} (${parent.email})`);

  const results: Array<{ name: string; regId: string; status: string }> = [];

  for (const [i, n] of NAMES.entries()) {
    const birthDate = new Date(2026 - n.age, 4, 10); // May 10
    const dob = `${birthDate.getFullYear()}-05-10`;
    const slot = slots[i % slots.length];

    const swimmer = await SwimmerModel.findOneAndUpdate(
      { parentId, firstName: n.firstName, lastName: n.lastName, birthDate },
      {
        $set: {
          parentId,
          firstName: n.firstName,
          lastName: n.lastName,
          birthDate,
          isActive: true,
          clubName: "Seed Club",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    const reg = await RegistrationModel.findOneAndUpdate(
      { tryoutId: tryout._id, swimmerId: swimmer!._id },
      {
        $set: {
          tryoutId: tryout._id,
          swimmerId: swimmer!._id,
          parentId,
          sessionId: session._id,
          slotId: slot._id,
          segmentId,
          status: "registered",
          registeredAt: new Date(),
          emailSent: false,
          checkedInAt: null,
          checkedInBy: null,
          usaVerificationStatus: "pending",
          swimmerDetails: {
            firstName: n.firstName,
            lastName: n.lastName,
            dob,
            ageOnTryoutDay: n.age,
            hasUsaMembership: false,
            clubName: "Seed Club",
            guardianName: `${parent.firstName} ${parent.lastName}`.trim() || "Seed Parent",
            guardianEmail: parent.email,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    results.push({ name: `${n.firstName} ${n.lastName}`, regId: String(reg!._id), status: "registered" });
  }

  console.log("\n[seed-names] done — registrations:");
  for (const r of results) {
    console.log(`  ${r.regId}  ${r.status.padEnd(11)} ${r.name}`);
  }
  console.log(`\n[seed-names] total registrations for tryout: ${await RegistrationModel.countDocuments({ tryoutId: TRYOUT_ID })}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed-names] fatal:", err);
  process.exit(1);
});
