import mongoose from 'mongoose';

// ─── Counter schema ───────────────────────────────────────────────────────────

const counterSchema = new mongoose.Schema({
  _id: String, // key: e.g., "claim_NY_2025"
  seq: { type: Number, default: 0 },
});

const CounterModel = mongoose.model('Counter', counterSchema);

// ─── Atomic counter ───────────────────────────────────────────────────────────

/**
 * Atomically increments a per-state-per-year sequence counter and returns
 * a formatted claim number in the form {STATE}-{YYYY}-{000001}.
 *
 * Uses findOneAndUpdate with upsert so concurrent requests never race for the
 * same number — MongoDB guarantees the atomic increment.
 *
 * @param state - Two-letter state code (e.g. 'NY')
 * @returns Unique claim number string
 */
export async function generateClaimNumber(state: string): Promise<string> {
  const year = new Date().getFullYear();
  const key = `claim_${state}_${year}`;

  const result = await CounterModel.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  const seq = result?.seq ?? 1;
  return `${state}-${year}-${String(seq).padStart(6, '0')}`;
}
