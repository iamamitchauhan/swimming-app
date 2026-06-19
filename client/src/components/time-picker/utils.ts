import type { Meridiem, TimeValue } from "./types";

export const pad2 = (n: number): string => n.toString().padStart(2, "0");

/**
 * Parse a time string. Accepts:
 *  - "hh:mm AM/PM" (12-hour) e.g. "02:30 PM", "2:30 pm"
 *  - "HH:mm" (24-hour) e.g. "14:30"
 * Returns null when input is empty or unparsable.
 */
export function parseTimeString(
  input: string | undefined | null,
): { hours24: number; minute: number } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const twelve = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelve) {
    let h = parseInt(twelve[1], 10);
    const m = parseInt(twelve[2], 10);
    const period = twelve[3].toUpperCase() as Meridiem;
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === "AM") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
    return { hours24: h, minute: m };
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const h = parseInt(twentyFour[1], 10);
    const m = parseInt(twentyFour[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hours24: h, minute: m };
  }

  return null;
}

export function hours24ToParts(hours24: number): {
  hour12: number;
  period: Meridiem;
} {
  const period: Meridiem = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour12, period };
}

export function partsToHours24(
  hour12: number,
  period: Meridiem,
): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function buildTimeValue(
  hours24: number,
  minute: number,
  showMeridiem: boolean,
): TimeValue {
  const { hour12, period } = hours24ToParts(hours24);
  const formatted = showMeridiem
    ? `${pad2(hour12)}:${pad2(minute)} ${period}`
    : `${pad2(hours24)}:${pad2(minute)}`;
  return {
    formatted,
    hour: showMeridiem ? hour12 : hours24,
    minute,
    period,
    hours24,
  };
}

export function generateHourOptions(showMeridiem: boolean): number[] {
  if (showMeridiem) return Array.from({ length: 12 }, (_, i) => i + 1);
  return Array.from({ length: 24 }, (_, i) => i);
}

export function generateMinuteOptions(step: number): number[] {
  const s = Math.max(1, Math.min(60, Math.floor(step) || 1));
  const out: number[] = [];
  for (let m = 0; m < 60; m += s) out.push(m);
  return out;
}

/** Snap a minute value to the nearest valid step option (downwards). */
export function snapMinute(minute: number, step: number): number {
  const opts = generateMinuteOptions(step);
  // pick largest option <= minute, fallback to first
  let best = opts[0];
  for (const o of opts) if (o <= minute) best = o;
  return best;
}
