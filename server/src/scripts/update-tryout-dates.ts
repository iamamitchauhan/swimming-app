/**
 * Update script — sets tryout startAt and endAt to random dates
 * between 20 Jun 2026 and 30 Jun 2026.
 *
 * Run: npx ts-node src/scripts/update-tryout-dates.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { TryoutModel } from '../models/tryout.model';

const MONGODB_URI = process.env['MONGODB_URI'];

if (!MONGODB_URI) {
  console.error('[update-tryout-dates] MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

const MIN_DATE = new Date('2026-06-20T00:00:00Z').getTime();
const MAX_DATE = new Date('2026-06-30T23:59:59Z').getTime();

function randomDate(min: number, max: number): Date {
  const ts = Math.floor(min + Math.random() * (max - min));
  return new Date(ts);
}

async function run(): Promise<void> {
  await mongoose.connect(MONGODB_URI as string);
  console.log('[update-tryout-dates] Connected to MongoDB');

  const tryouts = await TryoutModel.find().exec();
  console.log(`[update-tryout-dates] Found ${tryouts.length} tryout(s)`);

  let updated = 0;
  for (const tryout of tryouts) {
    const startAt = randomDate(MIN_DATE, MAX_DATE);
    const endAt = randomDate(startAt.getTime(), MAX_DATE);

    tryout.startAt = startAt;
    tryout.endAt = endAt;
    await tryout.save();
    updated++;

    console.log(
      `  → ${tryout._id.toString()}: startAt=${startAt.toISOString()}  endAt=${endAt.toISOString()}`,
    );
  }

  console.log(`[update-tryout-dates] Updated ${updated} tryout(s)`);
  await mongoose.disconnect();
  console.log('[update-tryout-dates] Done.');
}

run().catch((err) => {
  console.error('[update-tryout-dates] Fatal error:', err);
  process.exit(1);
});
