import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  Registration,
  RegistrationListParams,
  RegistrationSortField,
  SortOrder,
} from "@/lib/api/tryouts.api";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { useTryout } from "@/hooks/use-tryouts";
import { useTryoutRegistration, useSaveScore } from "@/hooks/use-tryout-dashboard";
import { calculateDetailedScoreTotal } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(r: Partial<Registration>) {
  return calculateDetailedScoreTotal(r.detailed_scores);
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
      max={5}
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
        const clamped = Math.min(5, Math.max(0, num));
        onChange(String(clamped));
      }}
      className={`w-14 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
      }`}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

const ALL_STATUSES = ["registered", "waitlisted", "offered", "rejected", "cancelled"] as const;

type ScoreEdits = Record<string, Partial<Registration>>;

interface Props {
  tryoutId: string;
  registerId?: string;
}

function SortIcon({ field, active, order }: { field: string; active: string; order: SortOrder }) {
  if (field !== active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 ml-1 inline" />;
  return order === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-gray-700 ml-1 inline" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-gray-700 ml-1 inline" />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringTab({ tryoutId, registerId }: Props) {
  const { data: tryout } = useTryout(tryoutId);
  const [, setSearchParams] = useSearchParams();
  const [params, setParams] = useState<RegistrationListParams>(() => ({
    page: 1,
    limit: 10,
    sortBy: "swimmer_name",
    sortOrder: "asc",
    ...(registerId ? { registerId } : {}),
  }));
  const { data: result, isFetching: loading } = useTryoutRegistration(tryoutId, params);
  const { registrations = [], total = 0, page = 1, totalPages = 0 } = result ?? {};
  const saveScoreMutation = useSaveScore(tryoutId);

  useEffect(() => {
    if (registerId) {
      setParams((prev) => ({ ...prev, registerId, page: 1 }));
    }
  }, [registerId]);

  const clearRegisterFilter = useCallback(() => {
    setParams((prev) => {
      const next = { ...prev };
      delete next.registerId;
      next.page = 1;
      return next;
    });
    setSearchParams({ tab: "scoring" }, { replace: true });
  }, [setSearchParams]);

  function onParamsChange(next: Partial<RegistrationListParams>) {
    setParams((prev) => ({ ...prev, ...next }));
  }

  const [scoreEdits, setScoreEdits] = useState<ScoreEdits>({});
  const [savingScores, setSavingScores] = useState<Record<string, boolean>>({});

  const regIds = registrations.map((r) => r.id).join(",");
  useEffect(() => {
    setScoreEdits({});
  }, [regIds]);

  const sortBy = params.sortBy ?? "swimmer_name";
  const sortOrder = params.sortOrder ?? "asc";

  function handleSort(field: RegistrationSortField) {
    if (sortBy === field) {
      onParamsChange({ sortBy: field, sortOrder: sortOrder === "asc" ? "desc" : "asc", page: 1 });
    } else {
      onParamsChange({ sortBy: field, sortOrder: "asc", page: 1 });
    }
  }

  const segmentLabel =
    tryout?.segments?.find((s) => (s as any).id === params.segmentId || s.name === params.segmentId)
      ?.name ?? (params.segmentId ? params.segmentId : "All segments");

  const statusLabel = params.status
    ? params.status.charAt(0).toUpperCase() + params.status.slice(1)
    : "All status";

  function getScore(id: string, field: keyof Registration, fallback: boolean | string | number) {
    return scoreEdits[id]?.[field] ?? registrations.find((r) => r.id === id)?.[field] ?? fallback;
  }

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
      await saveScoreMutation.mutateAsync({ regId: id, edits: scoreEdits[id] });
      setScoreEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setSavingScores((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (loading && registrations.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  // ── Shared filter bar (used by both layouts) ──────────────────────────────
  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 py-4 border-b border-gray-50 px-0.5 mt-1">
      <SearchInput
        value={params.registerId ? (registrations[0]?.swimmer_name ?? "") : (params.search ?? "")}
        onChange={(v) => {
          if (params.registerId) {
            clearRegisterFilter();
          } else {
            onParamsChange({ search: v, page: 1 });
          }
        }}
        placeholder="Search swimmer…"
        className="flex-1 min-w-0 bg-white"
        debounceMs={params.registerId ? 0 : 350}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            {segmentLabel}
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onParamsChange({ segmentId: undefined, page: 1 })}>
            All segments
          </DropdownMenuItem>
          {tryout?.segments?.map((seg, i) => (
            <DropdownMenuItem
              key={i}
              onClick={() => onParamsChange({ segmentId: (seg as any).id ?? seg.name, page: 1 })}
            >
              {seg.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-1.5 cursor-pointer capitalize whitespace-nowrap">
            {statusLabel}
            <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onParamsChange({ status: undefined, page: 1 })}>
            All status
          </DropdownMenuItem>
          {ALL_STATUSES.map((s) => (
            <DropdownMenuItem
              className="capitalize"
              key={s}
              onClick={() => onParamsChange({ status: s, page: 1 })}
            >
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ── Shared pagination ──────────────────────────────────────────────────────
  const pagination = totalPages > 1 && (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>
        Showing{" "}
        <span className="font-medium">
          {(page - 1) * (params.limit ?? 10) + 1}–{Math.min(page * (params.limit ?? 10), total)}
        </span>{" "}
        of <span className="font-medium">{total}</span>
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onParamsChange({ page: page - 1 })}
        >
          Previous
        </Button>
        <span className="text-xs text-gray-500">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onParamsChange({ page: page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {filterBar}

      {/* ── Hint bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-400">Scores 1–5 · Safety = Entry/Exit & Float</div>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT — card per swimmer (hidden on lg+)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden space-y-3 py-3">
        {!loading && registrations.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No swimmers found</div>
        )}
        {loading && registrations.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}
        {registrations.map((r, i) => {
          const hasEdits = !!scoreEdits[r.id];
          const merged = { ...r, ...scoreEdits[r.id] };
          const avgScore = avg(merged);
          const isBlocked = r.status === "cancelled" || r.status === "rejected";
          return (
            <div
              key={r.id}
              className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
                isBlocked ? "border-red-100 opacity-75" : "border-gray-200"
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium text-gray-400 shrink-0">
                    #{(page - 1) * (params.limit ?? 10) + i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {r.swimmer_name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {r.segment_name}
                      {r.swimmer_age ? ` · Age ${r.swimmer_age}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isBlocked && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 rounded px-1.5 py-0.5">
                      {r.status}
                    </span>
                  )}
                  {avgScore && (
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 rounded-lg px-2 py-0.5">
                      {avgScore}
                    </span>
                  )}
                </div>
              </div>

              {/* Safety checks */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20 shrink-0">Entry/Exit</span>
                  <ScoreCell
                    bool
                    disabled={isBlocked}
                    value={getScore(r.id, "safety_entry_exit", false) as boolean}
                    onChange={(v) => editScore(r.id, "safety_entry_exit", v, r.status)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-10 shrink-0">Float</span>
                  <ScoreCell
                    bool
                    disabled={isBlocked}
                    value={getScore(r.id, "safety_float", false) as boolean}
                    onChange={(v) => editScore(r.id, "safety_float", v, r.status)}
                  />
                </div>
              </div>

              {/* Stroke scores grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
                {(
                  [
                    ["freestyle", "Freestyle"],
                    ["backstroke", "Backstroke"],
                    ["breaststroke", "Breaststroke"],
                    ["butterfly", "Butterfly"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 shrink-0">{label}</span>
                    <ScoreCell
                      disabled={isBlocked}
                      value={getScore(r.id, field as keyof Registration, "") as string}
                      onChange={(v) => editScore(r.id, field as keyof Registration, v, r.status)}
                    />
                  </div>
                ))}
              </div>

              {/* Notes + Save */}
              <div className="px-4 pb-4 space-y-2">
                <Textarea
                  readOnly={isBlocked}
                  value={getScore(r.id, "notes", "") as string}
                  onChange={(e) => editScore(r.id, "notes", e.target.value, r.status)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm resize-none"
                  rows={2}
                  placeholder="Add notes…"
                />
                <button
                  onClick={() => saveScore(r.id)}
                  disabled={!hasEdits || savingScores[r.id] || isBlocked}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                    hasEdits && !isBlocked
                      ? "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
                      : "bg-gray-100 text-gray-300 cursor-default"
                  }`}
                >
                  {savingScores[r.id] ? "Saving…" : hasEdits ? "Save scores" : "No changes"}
                </button>
              </div>
            </div>
          );
        })}
        {pagination}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT — table (hidden below lg)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-4">#</TableHead>
                <TableHead
                  className="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("swimmer_name")}
                >
                  Swimmer
                  <SortIcon field="swimmer_name" active={sortBy} order={sortOrder} />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none whitespace-nowrap text-center"
                  onClick={() => handleSort("swimmer_age")}
                >
                  Age
                  <SortIcon field="swimmer_age" active={sortBy} order={sortOrder} />
                </TableHead>
                <TableHead className="text-center">Entry/Exit</TableHead>
                <TableHead className="text-center">Float</TableHead>
                <TableHead className="text-center">Freestyle</TableHead>
                <TableHead className="text-center">Backstroke</TableHead>
                <TableHead className="text-center">Breaststroke</TableHead>
                <TableHead className="text-center">Butterfly</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Notes</TableHead>
                <TableHead className="text-center">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {loading && registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && registrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-gray-400">
                    No swimmers found
                  </TableCell>
                </TableRow>
              )}
              {registrations.map((r, i) => {
                const hasEdits = !!scoreEdits[r.id];
                const merged = { ...r, ...scoreEdits[r.id] };
                const avgScore = avg(merged);
                const isBlocked = r.status === "cancelled" || r.status === "rejected";
                return (
                  <TableRow key={r.id} className="hover:bg-gray-50 transition">
                    <TableCell className="text-gray-400 text-xs px-4 py-3">
                      {(page - 1) * (params.limit ?? 10) + i + 1}
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
                    <TableCell className="text-center text-gray-500 px-4 py-3">
                      {r.swimmer_age}
                    </TableCell>
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
                      <Textarea
                        readOnly={isBlocked}
                        value={getScore(r.id, "notes", "") as string}
                        onChange={(e) => editScore(r.id, "notes", e.target.value, r.status)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Add notes..."
                      />
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
        {pagination}
      </div>
    </div>
  );
}
