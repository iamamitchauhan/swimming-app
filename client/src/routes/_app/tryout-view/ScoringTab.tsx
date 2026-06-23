import { useState } from "react";
import type { Registration } from "@/lib/api/tryouts.api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4">#</TableHead>
              <TableHead>Swimmer</TableHead>
              <TableHead className="text-center">Age</TableHead>
              <TableHead className="text-center">Entry/Exit</TableHead>
              <TableHead className="text-center">Float</TableHead>
              <TableHead className="text-center">Freestyle</TableHead>
              <TableHead className="text-center">Backstroke</TableHead>
              <TableHead className="text-center">Breaststroke</TableHead>
              <TableHead className="text-center">Butterfly</TableHead>
              <TableHead className="text-center">Avg Score</TableHead>
              <TableHead className="text-center">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {registered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-gray-400">
                  No registered swimmers yet
                </TableCell>
              </TableRow>
            )}
            {registered.map((r, i) => {
              const hasEdits = !!scoreEdits[r.id];
              const merged = { ...r, ...scoreEdits[r.id] };
              const avgScore = avg(merged);
              const isBlocked = r.status === "cancelled" || r.status === "rejected";
              return (
                <TableRow key={r.id} className="hover:bg-gray-50 transition">
                  <TableCell className="text-gray-400 text-xs px-4 py-3">
                    {i + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {r.swimmer_name}
                    </div>
                    <div className="text-xs text-gray-400">{r.segment_name}</div>
                    {isBlocked && (
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mt-0.5">
                        {r.status}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-gray-500 px-4 py-3">{r.swimmer_age}</TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      bool
                      disabled={isBlocked}
                      value={getScore(r.id, "safety_entry_exit", false) as boolean}
                      onChange={(v) => editScore(r.id, "safety_entry_exit", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      bool
                      disabled={isBlocked}
                      value={getScore(r.id, "safety_float", false) as boolean}
                      onChange={(v) => editScore(r.id, "safety_float", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "freestyle", "") as string}
                      onChange={(v) => editScore(r.id, "freestyle", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "backstroke", "") as string}
                      onChange={(v) => editScore(r.id, "backstroke", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "breaststroke", "") as string}
                      onChange={(v) => editScore(r.id, "breaststroke", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, "butterfly", "") as string}
                      onChange={(v) => editScore(r.id, "butterfly", v, r.status)}
                    />
                  </TableCell>
                  <TableCell className="text-center font-semibold text-blue-700 px-4 py-3">
                    {avgScore || "—"}
                  </TableCell>
                  <TableCell className="text-center px-4 py-3">
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
