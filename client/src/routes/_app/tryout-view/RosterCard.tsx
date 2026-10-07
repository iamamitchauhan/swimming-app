import type { ReactNode } from "react";
import { Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Registration } from "@/lib/api/tryouts.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "9:05 AM" from a 24h ("09:05") or 12h ("9:05 AM") slot time. */
function fmtTime(t?: string) {
  if (!t) return "";
  // Already 12h format — return as-is
  if (/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/.test(t)) return t;
  // 24h format — convert to 12h
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * "9:00 – 9:15 AM" — the meridiem is dropped from the start time when both
 * ends share it, and kept on both when they don't ("11:45 AM – 12:15 PM").
 */
function fmtTimeRange(start?: string, end?: string) {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (!s && !e) return "—";
  if (!s || !e) return s || e;
  const meridiem = /([AaPp][Mm])$/.exec(e)?.[1];
  if (meridiem && s.endsWith(` ${meridiem}`)) {
    return `${s.slice(0, -(meridiem.length + 1))} – ${e}`;
  }
  return `${s} – ${e}`;
}

// ─── Status pill ─────────────────────────────────────────────────────────────

/** Card status pill: soft tint + solid dot. */
const CARD_STATUS_COLORS: Record<string, { pill: string; dot: string }> = {
  registered: { pill: "bg-indigo-50 text-indigo-600", dot: "bg-indigo-500" },
  offered: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  rejected: { pill: "bg-red-50 text-red-500", dot: "bg-red-500" },
  waitlisted: { pill: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  cancelled: { pill: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};

/** Soft, dot-prefixed status pill used by the roster card. */
function StatusPill({ status }: { status: string }) {
  const colors = CARD_STATUS_COLORS[status] ?? CARD_STATUS_COLORS.cancelled;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        colors.pill,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} aria-hidden="true" />
      {status}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RosterCardProps {
  registration: Registration;
  selected: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  /** Registration status shown as a pill on the swimmer row (admins only). */
  status?: string;
  /**
   * Check-in chip/button for the top row (admins only). When it's absent the
   * card falls back to the read-only "Not checked in yet" hint.
   */
  checkInControl?: ReactNode;
  /** Score control (Add score / Yes-No tally / read-only score). */
  scoreControl?: ReactNode;
  /** Coach-recommendation dropdown. */
  recommendationControl?: ReactNode;
  /** Offer/Reject + email footer; omit to hide it entirely. */
  footer?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * One registration as a card — the mobile equivalent of a table row.
 *
 * Layout mirrors the redesigned roster card: slot time + segment/age pill on
 * top, swimmer + parent on one line, then a single action row holding the score
 * control beside the coach-recommendation dropdown.
 */
export function RosterCard({
  registration: r,
  selected,
  onToggle,
  onOpenDetail,
  status,
  checkInControl,
  scoreControl,
  recommendationControl,
  footer,
}: RosterCardProps) {
  const parentName = r.guardian_name || r.parent_name;
  // Only a registered swimmer can still be checked in — everyone else (waitlisted,
  // cancelled, rejected, offered) gets no hint.
  const awaitingCheckIn = !r.checked_in_at && r.status === "registered";

  return (
    <div
      className={cn(
        "shadow-md rounded-xl border bg-white p-4 transition",
        selected ? "border-primary/40 bg-primary/5" : "border-gray-200",
      )}
    >
      {/* Top row: selection, slot time, check-in + segment/age */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${r.swimmer_name}`}
          className="cursor-pointer"
        />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-primary">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="truncate">{fmtTimeRange(r.slot_id?.startTime, r.slot_id?.endTime)}</span>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {checkInControl}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {r.segment_name ? `${r.segment_name} · ` : ""}Age {r.swimmer_age}
          </span>
        </div>
      </div>

      {/* Swimmer + parent */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <button type="button" onClick={onOpenDetail} className="min-w-0 text-left">
          <span className="block truncate text-sm font-semibold text-gray-900 hover:underline">
            {r.swimmer_name}
          </span>
        </button>
        {parentName && (
          <span className="min-w-0 truncate text-xs text-gray-500">Parent: {parentName}</span>
        )}
        {status && (
          <span className="ml-auto">
            <StatusPill status={status} />
          </span>
        )}
      </div>

      {/* Actions: score + coach recommendation (absent for inactive rows) */}
      {(scoreControl || recommendationControl) && (
        <div className="mt-3 flex items-center gap-2">
          <div className="shrink-0">{scoreControl}</div>
          <div className="min-w-0 flex-1">{recommendationControl}</div>
        </div>
      )}

      {awaitingCheckIn && !checkInControl && (
        <p className="mt-2 text-xs text-gray-400">Not checked in yet</p>
      )}

      {footer && <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">{footer}</div>}
    </div>
  );
}
