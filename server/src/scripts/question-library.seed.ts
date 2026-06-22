/**
 * Seed script — inserts the question library into the `question_library` collection.
 * Run: npx ts-node src/scripts/question-library.seed.ts
 * Idempotent: uses upsert on `category` so it is safe to re-run.
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { QuestionLibraryModel } from "../models/question-library.model";

const MONGODB_URI = process.env["MONGODB_URI"];

if (!MONGODB_URI) {
  console.error("[question-library.seed] MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

// ── Question library data ─────────────────────────────────────────────────────

const QUESTION_LIBRARY = [
  {
    sortOrder: 0,
    category: "⭐ Default Tryout Questions",
    questions: [
      {
        type: "checkbox",
        label: "Previous Swim Experience",
        required: true,
        options: [
          "Completed Swim Lessons",
          "Summer League Swim Team (FASST, Iron Express, Colony Sharks, etc.)",
          "YMCA Swim Team",
          "USA Swim Team",
          "High School Swim Team",
          "None",
        ],
      },
      {
        type: "text",
        label: "If you answered USA Swim Team — which team and group is your child training with?",
        required: false,
        placeholder: "Team name and training group",
      },
      {
        type: "text",
        label: "Best swim time — 50 Free",
        required: false,
        placeholder: "e.g. 0:45.23",
        meta: {
          inputType: "swim-time",
          unitOptions: ["yards", "meters"],
        },
      },
      {
        type: "text",
        label: "Best swim time — 100 Free",
        required: false,
        placeholder: "e.g. 1:23.45",
        meta: {
          inputType: "swim-time",
          unitOptions: ["yards", "meters"],
        },
      },
      {
        type: "text",
        label: "Best swim time — 100 Back",
        required: false,
        placeholder: "e.g. 1:30.00",
        meta: {
          inputType: "swim-time",
          unitOptions: ["yards", "meters"],
        },
      },
      {
        type: "text",
        label: "Best swim time — 100 IM",
        required: false,
        placeholder: "e.g. 1:35.00",
        meta: {
          inputType: "swim-time",
          unitOptions: ["yards", "meters"],
        },
      },
      {
        type: "checkbox",
        label: "Can perform legal strokes",
        required: true,
        options: ["Butterfly", "Backstroke", "Breaststroke", "Freestyle", "Knows some strokes", "None"],
      },
      {
        type: "checkbox",
        label: "Can your athlete perform legal racing starts?",
        required: true,
        options: ["Racing Start off the blocks", "Backstroke Start", "Cannot perform starts"],
      },
      {
        type: "checkbox",
        label: "Can your athlete perform legal turns?",
        required: true,
        options: ["Freestyle Flip Turn", "Backstroke Flip Turn", "Open Turns", "Cannot perform turns"],
      },
    ],
  },
  {
    sortOrder: 1,
    category: "🧍 Basic Info",
    questions: [
      { type: "text", label: "Date of Birth (for age verification)", required: true, placeholder: "MM/DD/YYYY" },
      { type: "radio", label: "Gender", required: false, options: ["Male", "Female", "Non-binary", "Prefer not to say"] },
      { type: "text", label: "USA Swimming ID Number", required: false, placeholder: "e.g. 12345678" },
      {
        type: "radio",
        label: "Favorite Stroke",
        required: false,
        options: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM / No preference"],
      },
      {
        type: "radio",
        label: "T-Shirt Size",
        required: false,
        options: ["XS (Extra Small)", "S (Small)", "M (Medium)", "L (Large)", "XL (Extra Large)", "2XL (Double Extra Large)"],
      },
      {
        type: "radio",
        label: "How did you hear about this tryout?",
        required: false,
        options: ["Email", "Social Media", "Word of Mouth", "School", "Website", "Other"],
      },
    ],
  },
  {
    sortOrder: 2,
    category: "⏱ Best Times",
    questions: [
      {
        type: "text",
        label: "Best time — 50 Free",
        required: false,
        placeholder: "e.g. 0:28.45",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 50 Back",
        required: false,
        placeholder: "e.g. 0:33.10",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 50 Breast",
        required: false,
        placeholder: "e.g. 0:38.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 50 Fly",
        required: false,
        placeholder: "e.g. 0:31.50",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 100 Free",
        required: false,
        placeholder: "e.g. 1:03.45",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 100 Back",
        required: false,
        placeholder: "e.g. 1:12.30",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 100 Breast",
        required: false,
        placeholder: "e.g. 1:22.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 100 Fly",
        required: false,
        placeholder: "e.g. 1:10.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 100 IM",
        required: false,
        placeholder: "e.g. 1:15.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 200 IM",
        required: false,
        placeholder: "e.g. 2:35.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 200 Free",
        required: false,
        placeholder: "e.g. 2:20.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
      {
        type: "text",
        label: "Best time — 500 Free",
        required: false,
        placeholder: "e.g. 6:10.00",
        meta: { inputType: "swim-time", unitOptions: ["yards", "meters"] },
      },
    ],
  },
  {
    sortOrder: 3,
    category: "🏅 Time Standards / Cuts",
    questions: [
      {
        type: "radio",
        label: "Highest Time Standard / Cut Achieved (any event)",
        required: false,
        options: ["AAAA", "AAA", "AA", "A", "BB", "B", "C", "None / Not yet achieved"],
      },
      { type: "text", label: "50 Free — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "50 Back — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "50 Breast — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "50 Fly — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "100 Free — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "100 Back — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "100 Breast — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "100 Fly — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
      { type: "text", label: "200 IM — Cut / Standard Achieved", required: false, placeholder: "AAAA / AAA / AA / A / BB / B / C / None" },
    ],
  },
  {
    sortOrder: 4,
    category: "🏊 Swim Experience",
    questions: [
      { type: "text", label: "Years of Competitive Swimming Experience", required: false, placeholder: "e.g. 2" },
      { type: "text", label: "Current/Previous Club Team(s)", required: false, placeholder: "Club name(s)" },
      {
        type: "radio",
        label: "Preferred Training Group Level",
        required: false,
        options: ["Beginner / Developmental", "Intermediate / Age Group", "Senior / Pre-Elite", "Elite / National"],
      },
      { type: "radio", label: "Can swim 25 yards/meters unassisted?", required: false, options: ["Yes", "No"] },
      { type: "radio", label: "Can swim 100 yards/meters continuously?", required: false, options: ["Yes", "No"] },
      {
        type: "checkbox",
        label: "Comfortable with Diving Starts From",
        required: false,
        options: ["Starting blocks", "Deck level", "In-water start only", "Not yet comfortable diving"],
      },
      {
        type: "checkbox",
        label: "Practice Availability (days per week)",
        required: false,
        options: ["1–2 days", "3–4 days", "5–6 days", "7 days / unlimited"],
      },
      { type: "textarea", label: "Goals for This Season", required: false, placeholder: "What does the swimmer hope to achieve?" },
    ],
  },
  {
    sortOrder: 5,
    category: "🏥 Health & Safety",
    questions: [
      {
        type: "textarea",
        label: "Medical Conditions / Allergies Coaches Should Know About",
        required: false,
        placeholder: 'List any conditions, medications, or allergies — or write "None"',
      },
      {
        type: "radio",
        label: "Does the swimmer have asthma or exercise-induced breathing issues?",
        required: false,
        options: ["Yes", "No", "Managed with medication"],
      },
      { type: "radio", label: "Has the swimmer had any injuries in the past 12 months?", required: false, options: ["Yes — describe below", "No"] },
      {
        type: "textarea",
        label: "Injury details (if applicable)",
        required: false,
        placeholder: "Describe any recent injuries or physical limitations",
      },
      { type: "text", label: "Emergency Contact Name & Phone", required: true, placeholder: "Full name and phone number" },
      { type: "text", label: "Primary Care Physician Name & Phone", required: false, placeholder: "Optional — for medical emergencies" },
      {
        type: "radio",
        label: "Is the swimmer cleared by a doctor for vigorous physical activity?",
        required: false,
        options: ["Yes", "No", "Has restrictions — see medical notes"],
      },
    ],
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  await mongoose.connect(MONGODB_URI as string);
  console.log("[question-library.seed] Connected to MongoDB");

  let created = 0;
  let updated = 0;

  for (const entry of QUESTION_LIBRARY) {
    const result = await QuestionLibraryModel.updateOne({ category: entry.category }, { $set: entry }, { upsert: true });

    if (result.upsertedCount > 0) {
      console.log(`[question-library.seed]  + Created: "${entry.category}"`);
      created++;
    } else if (result.modifiedCount > 0) {
      console.log(`[question-library.seed]  ~ Updated: "${entry.category}"`);
      updated++;
    } else {
      console.log(`[question-library.seed]  = No change: "${entry.category}"`);
    }
  }

  console.log(
    `[question-library.seed] Done — ${created} created, ${updated} updated, ` + `${QUESTION_LIBRARY.length - created - updated} unchanged.`,
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[question-library.seed] Fatal error:", err);
  process.exit(1);
});
