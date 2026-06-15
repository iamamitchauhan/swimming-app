import type { Registration } from "@/lib/api/tryouts.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  waitlisted: Registration[];
  onPromote: (id: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaitlistTab({ waitlisted, onPromote }: Props) {
  const sorted = [...waitlisted].sort(
    (a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0),
  );

  return (
    <div className="p-4">
      {sorted.length === 0 && (
        <p className="text-gray-400 text-center py-8">No one on waitlist</p>
      )}
      <div className="space-y-2">
        {sorted.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3"
          >
            <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {r.waitlist_position}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {r.swimmer_name}{" "}
                <span className="text-gray-400 text-sm">age {r.swimmer_age}</span>
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
              onClick={() => onPromote(r.id)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Promote →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
