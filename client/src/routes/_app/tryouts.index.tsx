import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Eye,
  Rocket,
  LayoutDashboard,
} from "lucide-react";
import { useTryouts, useDeleteTryout, usePublishTryout } from "@/hooks/use-tryouts";
import type { Tryout, TryoutSortField, SortOrder } from "@/lib/api/tryouts.api";
import { statusLabel } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusVariant: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-destructive/10 text-destructive border-destructive/20",
  published:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function firstSessionDate(t: Tryout) {
  const d = t.startDate ?? t.sessions?.[0]?.date;
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SORT_OPTIONS: { value: TryoutSortField; label: string }[] = [
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

const STATUS_TABS: { label: string; value: string; apiValue?: string }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published", apiValue: "open" },
  { label: "Closed", value: "closed" },
  { label: "Completed", value: "completed" },
];

const PAGE_SIZE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TryoutsList() {
  const navigate = useNavigate();

  // ── Filter / sort / pagination state ────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<TryoutSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Tryout | null>(null);

  // Debounce search input → search param (400 ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when any filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters = search || statusFilter !== "all" || dateFrom || dateTo;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error, isFetching } = useTryouts({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status:
      statusFilter !== "all"
        ? (STATUS_TABS.find((t) => t.value === statusFilter)?.apiValue ?? statusFilter)
        : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortOrder,
  });

  const tryouts = data?.tryouts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const deleteMutation = useDeleteTryout();
  const publishMutation = usePublishTryout();

  const [publishTarget, setPublishTarget] = useState<Tryout | null>(null);

  function confirmPublish() {
    if (!publishTarget) return;
    publishMutation.mutate(publishTarget._id, {
      onSuccess: () => {
        toast.success(`"${publishTarget.name}" published.`);
        setPublishTarget(null);
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Publish failed.");
        setPublishTarget(null);
      },
    });
  }

  // ── Sort column toggle ───────────────────────────────────────────────────────
  function handleSortField(field: TryoutSortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  function SortIcon({ field }: { field: TryoutSortField }) {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />
    );
  }

  // ── Delete handler ───────────────────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
        setDeleteTarget(null);
      },
    });
  }

  return (
    <PageShell
      title="Tryouts"
      actions={
        <Button onClick={() => navigate("/tryouts/new")}>
          <Plus className="h-4 w-4 mr-1.5" /> New tryout
        </Button>
      }
    >
      <div className="bg-card rounded-xl border border-border">
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="p-4 flex flex-col gap-3 border-b border-border">
          {/* Row 1: search + status + sort */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-1">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-b border-border flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tryouts..."
                  className="pl-9 pr-8 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* <Select value={sortBy} onValueChange={(v) => setSortBy(v as TryoutSortField)}>
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select> */}

            {/* <Button
              variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button> */}

            {/* {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )} */}
          </div>

          {/* Row 2: date range */}
          {/* <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
              <Input
                type="date"
                className="h-9 w-40 text-sm"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
              <Input
                type="date"
                className="h-9 w-40 text-sm"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div> */}
        </div>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading tryouts…</span>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {isError && (
          <div className="flex items-center gap-3 m-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error instanceof Error ? error.message : "Failed to load tryouts."}</span>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <>
            <div
              className={`overflow-x-auto transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSortField("name")}
                      >
                        Title <SortIcon field="name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSortField("status")}
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead>Age Segments</TableHead>
                    <TableHead className="text-center">Slots</TableHead>
                    <TableHead className="text-center">Registered</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tryouts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-12 text-sm"
                      >
                        {hasActiveFilters
                          ? "No tryouts match your filters."
                          : "No tryouts yet. Create your first one!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tryouts.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>
                          <Link
                            to={`/tryouts/view/${t._id}`}
                            className="font-medium hover:text-primary"
                          >
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusVariant[t.status] ?? ""}>
                            {statusLabel(t.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {firstSessionDate(t)}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground max-w-[140px] truncate"
                          title={t.location}
                        >
                          {t.location
                            ? t.location.length > 18
                              ? t.location.slice(0, 18) + "…"
                              : t.location
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {t.sessionCount ?? t.sessions?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(t.segments ?? []).length === 0 ? (
                              <span className="text-muted-foreground text-sm">—</span>
                            ) : (
                              (t.segments ?? []).slice(0, 3).map((seg, i) => {
                                const badgeColors = [
                                  "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
                                  "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
                                  "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
                                ];
                                return (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className={`text-[10px] font-medium whitespace-nowrap ${badgeColors[i % badgeColors.length]}`}
                                  >
                                    {seg.minAge}–{seg.maxAge} {seg.level}
                                  </Badge>
                                );
                              })
                            )}
                            {(t.segments ?? []).length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{t.segments.length - 3}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {t.totalSlots ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{t.registeredCount ?? 0}</span>
                          {(t.totalSlots ?? 0) > 0 && (
                            <span className="text-muted-foreground text-sm">
                              /{t.totalSlots * t.swimmersPerSlot}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => navigate(`/tryouts/preview/${t._id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" /> Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => navigate(`/tryouts/view/${t._id}`)}
                              >
                                <LayoutDashboard className="h-4 w-4 mr-2" /> Manage
                              </DropdownMenuItem>
                              {(() => {
                                const isEditDisabled =
                                  ["open", "published"].includes(t.status) &&
                                  (t.registeredCount ?? 0) >= 1;
                                const editItem = (
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={isEditDisabled}
                                    onClick={() => navigate(`/tryouts/edit/${t._id}`)}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                );
                                return isEditDisabled ? (
                                  <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block">{editItem}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        Cannot edit tryouts that already have registrations.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  editItem
                                );
                              })()}
                              {t.status === "draft" && (
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() => setPublishTarget(t)}
                                >
                                  <Rocket className="h-4 w-4 mr-2" /> Publish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {(() => {
                                const isDeleteDisabled = t.status !== "published";
                                const deleteItem = (
                                  <DropdownMenuItem
                                    disabled={isDeleteDisabled}
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => setDeleteTarget(t)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                );
                                return isDeleteDisabled ? (
                                  <TooltipProvider delayDuration={0}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block">{deleteItem}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="left">
                                        Only published tryouts can be deleted.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  deleteItem
                                );
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination footer ──────────────────────────────────────── */}
            <div className="p-4 flex items-center justify-between text-sm text-muted-foreground border-t border-border">
              <span>
                {total} tryout{total !== 1 ? "s" : ""}
                {hasActiveFilters && " (filtered)"}
                {totalPages > 1 && ` · page ${page} of ${totalPages}`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1">
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isFetching}
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Publish confirmation dialog ────────────────────────────────────── */}
      <AlertDialog open={!!publishTarget} onOpenChange={(o) => !o && setPublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish tryout?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{publishTarget?.name}</span> will be
              published and visible to the public for registration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmPublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tryout?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be
              permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
