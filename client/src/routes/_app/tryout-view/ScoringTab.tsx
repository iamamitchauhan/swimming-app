import { useState } from "react";
import type { Registration } from "@/lib/api/tryouts.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(r: Partial<Registration>) {
  const scores = [r.freestyle, r.backstroke, r.breaststroke, r.butterfly]
    .map(Number)
    .filter((v) => !isNaN(v) && v > 0);
  if (!scores.length) return null;
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

// ─── ScoreCell ────────────────────────────────────────────────────────────────

function ScoreCell({
  value,
  onChange,
  bool = false,
  disabled = false,
}: {
  value: boolean | number | string | null | undefined;
  onChange: (v: boolean | string) => void;
  bool?: boolean;
  disabled?: boolean;
}) {
  if (bool) {
    return (
      <button
        disabled={disabled}
        onClick={() => onChange(!(value as boolean))}
        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
          disabled
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : value
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {value ? "✓" : "✕"}
      </button>
    );
  }
  return (
    <input
      type="number"
      min={1}
      max={10}
      disabled={disabled}
      value={(value as string | number) ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const num = Number(raw);
        if (isNaN(num)) return;
        const clamped = Math.min(10, Math.max(0, num));
        onChange(String(clamped));
      }}
      className={`w-14 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
      }`}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ScoreEdits = Record<string, Partial<Registration>>;

interface Props {
  registered: Registration[];
  onSaveScore: (id: string, edits: Partial<Registration>) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringTab({ registered, onSaveScore }: Props) {
  const [scoreEdits, setScoreEdits] = useState<ScoreEdits>({});
  const [savingScores, setSavingScores] = useState<Record<string, boolean>>({});

  function getScore(id: string, field: keyof Registration, fallback: boolean | string | number) {
    return scoreEdits[id]?.[field] ?? registered.find((r) => r.id === id)?.[field] ?? fallback;
  }

  console.info("registered =>", registered);

  function editScore(
    id: string,
    field: keyof Registration,
    value: boolean | string,
    status?: string,
  ) {
    if (status === "cancelled" || status === "rejected") return;
    setScoreEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveScore(id: string) {
    if (!scoreEdits[id]) return;
    setSavingScores((prev) => ({ ...prev, [id]: true }));
    try {
      await onSaveScore(id, scoreEdits[id]);
      setScoreEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setSavingScores((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-400">Scores 1–10 · Safety = Entry/Exit/Float</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-900 text-white text-xs uppercase">
            <tr>
              <th className="px-3 py-3 text-left sticky left-0 bg-gray-900">#</th>
              <th className="px-3 py-3 text-left sticky left-8 bg-gray-900">Swimmer</th>
              <th className="px-3 py-3 text-center">Age</th>
              <th className="px-3 py-3 text-center">Entry/Exit</th>
              <th className="px-3 py-3 text-center">Float</th>
              <th className="px-3 py-3 text-center">Freestyle</th>
              <th className="px-3 py-3 text-center">Backstroke</th>
              <th className="px-3 py-3 text-center">Breaststroke</th>
              <th className="px-3 py-3 text-center">Butterfly</th>
              <th className="px-3 py-3 text-center">Avg Score</th>
              <th className="px-3 py-3 text-center">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {registered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                  No registered swimmers yet
                </td>
              </tr>
            )}
            {registered.map((r, i) => {
              const hasEdits = !!scoreEdits[r.id];
              const merged = { ...r, ...scoreEdits[r.id] };
              const avgScore = avg(merged);
              const isBlocked = r.status === "cancelled" || r.status === "rejected";
              return (
                <tr key={r.id} className="hover:bg-blue-50/30 transition">
                  <td className="px-3 py-3 text-gray-400 text-xs sticky left-0 bg-white">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3 sticky left-8 bg-white">
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {r.swimmer_name}
                    </div>
                    <div className="text-xs text-gray-400">{r.segment_name}</div>
                    {isBlocked && (
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mt-0.5">
                        {r.status}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500">{r.swimmer_age}</td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      bool
                      disabled={isBlocked}
                      value={getScore(r.id, "safety_entry_exit", false) as boolean}
                      onChange={(v) => editScore(r.id, "safety_entry_exit", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      bool
                      disabled={isBlocked}
                      value={getScore(r.id, "safety_float", false) as boolean}
                      onChange={(v) => editScore(r.id, "safety_float", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "freestyle", "") as string}
                      onChange={(v) => editScore(r.id, "freestyle", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "backstroke", "") as string}
                      onChange={(v) => editScore(r.id, "backstroke", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "breaststroke", "") as string}
                      onChange={(v) => editScore(r.id, "breaststroke", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "butterfly", "") as string}
                      onChange={(v) => editScore(r.id, "butterfly", v, r.status)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-blue-600">
                    {avgScore || "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => saveScore(r.id)}
                      disabled={!hasEdits || savingScores[r.id] || isBlocked}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                        hasEdits && !isBlocked
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "bg-gray-100 text-gray-300 cursor-default"
                      }`}
                    >
                      {savingScores[r.id] ? "…" : "✓"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
