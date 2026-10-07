import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { useTryoutSlots } from "@/hooks/use-tryout-dashboard";

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

export function SlotsTab({ tryoutId }: Props) {
  const { data: slots = [], isLoading } = useTryoutSlots(tryoutId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading slots…
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* ── Slots table (tablet, desktop and landscape phones) ───────────── */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 overflow-hidden phone-portrait:hidden">
        <table className="w-full">
          <thead className="bg-gray-900 text-white text-xs uppercase tracking-wide">
            <tr>
              {["Session", "Date", "Time", "Capacity", "Registered", "Available"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {slots.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No slots configured
                </td>
              </tr>
            )}
            {slots.map((s, i) => (
              <tr key={s._id || i} className="hover:bg-gray-50 text-xs">
                <td className="px-4 py-3 text-gray-600">{s.label || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(s.sessionDate)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
                </td>
                <td className="px-4 py-3">{s.capacity}</td>
                <td className="px-4 py-3">{s.registeredCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`font-semibold ${
                      parseInt(String(s.capacity - s.registeredCount)) > 0
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {s.capacity - s.registeredCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Slot cards (portrait phones only) ────────────────────────────── */}
      <div className="hidden phone-portrait:block space-y-2">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-gray-400">
            No slots configured
          </div>
        ) : (
          slots.map((s, i) => {
            const available = s.capacity - s.registeredCount;
            const isOpen = available > 0;
            return (
              <div key={s._id || i} className="rounded-xl border border-gray-200 bg-white p-4">
                {/* Header: slot label + availability pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {s.label || "—"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {fmtDate(s.sessionDate)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isOpen ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {isOpen ? `${available} available` : "Full"}
                  </span>
                </div>

                {/* Capacity · Registered · Available */}
                <div className="mt-3 flex items-stretch divide-x divide-gray-100 border-t border-gray-100 pt-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{s.capacity}</div>
                    <div className="text-[11px] text-gray-500">Capacity</div>
                  </div>
                  <div className="flex-1 pl-3">
                    <div className="text-sm font-semibold text-gray-900">{s.registeredCount}</div>
                    <div className="text-[11px] text-gray-500">Registered</div>
                  </div>
                  <div className="flex-1 pl-3">
                    <div
                      className={`text-sm font-semibold ${
                        isOpen ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {available}
                    </div>
                    <div className="text-[11px] text-gray-500">Available</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
