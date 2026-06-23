import { Loader2 } from "lucide-react";
import { useTryoutRegistration, usePromoteWaitlist } from "@/hooks/use-tryout-dashboard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaitlistTab({ tryoutId }: Props) {
  const { data, isLoading } = useTryoutRegistration(tryoutId, { limit: 1000 });
  const promote = usePromoteWaitlist(tryoutId);

  const waitlisted = (data?.registrations ?? []).filter((r) => r.status === "waitlisted");
  const sorted = [...waitlisted].sort(
    (a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-4">
      {sorted.length === 0 && <p className="text-gray-400 text-center py-8">No one on waitlist</p>}
      <div className="space-y-2">
        {sorted.map((r) => (
          <div key={r.id} className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {r.waitlist_position}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {r.swimmer_name} <span className="text-gray-400 text-sm">age {r.swimmer_age}</span>
              </div>
              <div className="text-xs text-gray-500">
                {r.guardian_name || r.parent_name} · {r.guardian_email || r.parent_email}
              </div>
              {r.segment_name && (
                <div className="text-xs text-blue-500 mt-0.5">{r.segment_name}</div>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {r.slot_start && `${fmtTime(r.slot_start)} · ${fmtDate(r.session_date)}`}
            </div>
            <button
              onClick={() => promote.mutate(r.id)}
              disabled={promote.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {promote.isPending ? "…" : "Promote →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
