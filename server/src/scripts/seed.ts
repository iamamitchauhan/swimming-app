/**
 * Seed script — creates the Super Admin user if it does not already exist.
 * Run once on a fresh database: npx ts-node src/scripts/seed.ts
 * Idempotent: safe to re-run.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { USER_ROLES } from '../shared/constants/roles';

const SUPER_ADMIN_EMAIL = process.env['SUPER_ADMIN_EMAIL'] ?? 'superadmin@yopmail.com';
const MONGODB_URI = process.env['MONGODB_URI'];

if (!MONGODB_URI) {
  console.error('[seed] MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function seed(): Promise<void> {
  await mongoose.connect(MONGODB_URI as string);
  console.log('[seed] Connected to MongoDB');

  const existing = await UserModel.findOne({ email: SUPER_ADMIN_EMAIL }).exec();

  if (existing) {
    console.log(`[seed] Super Admin already exists: ${SUPER_ADMIN_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  await new UserModel({
    email: SUPER_ADMIN_EMAIL,
    role: USER_ROLES.SUPER_ADMIN,
    status: 'active',
    emailVerified: true,
    firstName: 'Super',
    lastName: 'Admin',
    onboardingStep: 0,
    clubId: null,
  }).save();

  console.log(`[seed] Super Admin created: ${SUPER_ADMIN_EMAIL}`);
  await mongoose.disconnect();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
