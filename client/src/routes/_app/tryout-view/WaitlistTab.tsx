import { useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp, Loader2 } from "lucide-react";
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
import { useWaitlistByTryout } from "@/hooks/use-tryout-dashboard";
import type { WaitlistSortField, WaitlistListParams } from "@/lib/api/tryouts.api";
import type { SortOrder } from "@/lib/api/tryouts.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortIcon({ field, active, order }: { field: string; active: string; order: SortOrder }) {
  if (field !== active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 ml-1 inline" />;
  return order === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-white ml-1 inline" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-white ml-1 inline" />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WaitlistTab({ tryoutId }: Props) {
  const [params, setParams] = useState<WaitlistListParams>({
    page: 1,
    limit: 10,
    sortBy: "waitlistPosition",
    sortOrder: "asc",
  });

  const { data, isFetching } = useWaitlistByTryout(tryoutId, params);
  const { entries = [], total = 0, page = 1, totalPages = 0 } = data ?? {};

  function onParamsChange(next: Partial<WaitlistListParams>) {
    setParams((prev) => ({ ...prev, ...next }));
  }

  function handleSort(field: WaitlistSortField) {
    const currentSortBy = params.sortBy ?? "waitlistPosition";
    const currentSortOrder = params.sortOrder ?? "asc";
    if (currentSortBy === field) {
      onParamsChange({
        sortBy: field,
        sortOrder: currentSortOrder === "asc" ? "desc" : "asc",
        page: 1,
      });
    } else {
      onParamsChange({ sortBy: field, sortOrder: "asc", page: 1 });
    }
  }

  const sortBy = params.sortBy ?? "waitlistPosition";
  const sortOrder = params.sortOrder ?? "asc";

  return (
    <div>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 py-4 border-b border-gray-50 px-0.5 mt-1">
        <SearchInput
          value={params.search ?? ""}
          onChange={(v) => onParamsChange({ search: v, page: 1 })}
          placeholder="Search swimmer or guardian email…"
          className="flex-1 min-w-48 bg-white"
          debounceMs={350}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap w-16 text-center"
                onClick={() => handleSort("waitlistPosition")}
              >
                #
                <SortIcon field="waitlistPosition" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("swimmerFirstName")}
              >
                Swimmer
                <SortIcon field="swimmerFirstName" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("guardianEmail")}
              >
                Guardian
                <SortIcon field="guardianEmail" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("joinedAt")}
              >
                Joined
                <SortIcon field="joinedAt" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Notified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {isFetching && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isFetching && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-400">
                  No one on the waitlist
                </TableCell>
              </TableRow>
            )}
            {!isFetching &&
              entries.map((e) => (
                <TableRow key={e._id} className="hover:bg-gray-50 transition">
                  <TableCell className="text-center px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
                      {e.waitlistPosition}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-gray-900">
                    {e.swimmerFirstName} {e.swimmerLastName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500">{e.ageOnTryoutDay}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-600">{e.segmentId || "—"}</TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="text-gray-700">{e.guardianName}</div>
                    <div className="text-xs text-gray-400">{e.guardianEmail}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {fmtDate(e.joinedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {e.notifiedAt ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {fmtDate(e.notifiedAt)}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Not yet
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Showing{" "}
            <span className="font-medium">
              {(page - 1) * (params.limit ?? 10) + 1}–{Math.min(page * (params.limit ?? 10), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span> results
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
              Page {page} of {totalPages}
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
      )}
    </div>
  );
}
