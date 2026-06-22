import type { LeaderboardEntry } from "@/lib/api/tryouts.api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  leaderboard: LeaderboardEntry[];
  onDecision: (id: string, status: "offered" | "rejected") => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RANK_COLORS = [
  "bg-yellow-400 text-yellow-900",
  "bg-gray-300 text-gray-700",
  "bg-amber-600 text-white",
];

export function LeaderboardTab({ leaderboard, onDecision }: Props) {
  if (leaderboard.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-400 text-center py-8">No scores yet</p>
      </div>
    );
  }

  const segments = [...new Set(leaderboard.map((l) => l.segment_name || l.age_segment || "Other"))];

  return (
    <div className="py-4 space-y-6">
      {segments.map((seg) => {
        const group = leaderboard.filter(
          (l) => (l.segment_name || l.age_segment || "Other") === seg,
        );
        return (
          <div
            key={seg}
            className="overflow-x-auto bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800">{seg}</h3>
              <span className="text-xs text-gray-400">{group.length} scored</span>
            </div>
            <div className="divide-y divide-gray-50">
              {group.map((l, i) => (
                <div key={l.registration_id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      RANK_COLORS[i] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{l.swimmer_name}</span>
                    <span className="text-gray-400 text-sm ml-2">age {l.swimmer_age}</span>
                  </div>
                  <div className="w-12 text-right">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Score
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {parseFloat(String(l.total_score)).toFixed(1)}
                    </div>
                  </div>
                  <div className="flex gap-1.5 ml-3">
                    {l.status !== "offered" ? (
                      <button
                        onClick={() => onDecision(l.registration_id, "offered")}
                        className="text-xs text-gray-500 hover:text-green-600 font-medium hover:underline"
                      >
                        Mark offer
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓ Offered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
