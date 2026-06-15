import type { TryoutSlot } from "@/lib/api/tryouts.api";

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
  slots: TryoutSlot[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotsTab({ slots }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-white text-xs uppercase">
          <tr>
            {["Session", "Date", "Time", "Capacity", "Registered", "Available"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
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
            <tr key={s._id || i} className="hover:bg-gray-50">
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
                    parseInt(String(s.capacity - s.registeredCount)) > 0 ? "text-green-600" : "text-red-500"
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
  );
}
