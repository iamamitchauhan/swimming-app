import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth.store";
import { PageShell } from "@/components/page-shell";
import { SegmentBadges } from "@/components/swimmer-tryout/SegmentBadges";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
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

// ─── Tryout row actions (shared by desktop table & mobile cards) ──────────────

function TryoutActions({ t }: { t: Tryout }) {
  const navigate = useNavigate();
  const [publishTarget, setPublishTarget] = useState<Tryout | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tryout | null>(null);
  const deleteMutation = useDeleteTryout();
  const publishMutation = usePublishTryout();

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              !["draft", "published", "open"].includes(t.status) ||
              (["published", "open"].includes(t.status) && (t.registeredCount ?? 0) >= 1);
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
            const isDeleteDisabled =
              ["published", "open"].includes(t.status) && (t.registeredCount ?? 0) >= 1;
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
                    Cannot delete published tryouts with registrations.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              deleteItem
            );
          })()}
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TryoutsList() {
  const navigate = useNavigate();

  // ── Filter / sort / pagination state ────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<TryoutSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);

  // Reset page when any filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters = search || statusFilter !== "all" || dateFrom || dateTo;

  function clearFilters() {
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

  return (
    <PageShell title="Tryouts">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="pb-4 flex flex-col gap-3">
        {/* Row 1: status tabs */}
        <div className="flex items-start overflow-x-auto">
          <SegmentedTabs
            tabs={STATUS_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
            active={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
        </div>
        {/* Row 2: search + new button */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search tryouts..."
            className="w-full sm:w-lg"
            debounceMs={400}
          />
          {useAuthStore((s) => s.user?.role) === "admin" && (
            <Button onClick={() => navigate("/tryouts/new")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1.5" /> New tryout
            </Button>
          )}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border">
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

        {/* ── Table (desktop) ─────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <>
            <div
              className={`hidden md:block overflow-x-auto bg-white rounded-xl rounded-bl-none rounded-br-none border border-gray-200 overflow-hidden ${isFetching ? "opacity-60" : ""}`}
            >
              <Table>
                <TableHeader className="bg-gray-900 text-xs uppercase tracking-wide">
                  <TableRow>
                    <TableHead className="sticky left-0 bg-gray-900 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center " onClick={() => handleSortField("name")}>
                        Title <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center " onClick={() => handleSortField("status")}>
                        Status <SortIcon field="status" />
                      </div>
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
                        <TableCell className="sticky left-0 bg-white z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
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
                        <TableCell className="text-muted-foreground">
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
                        <TableCell className="text-center">
                          {t.sessionCount ?? t.sessions?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <SegmentBadges segments={t.segments ?? []} />
                        </TableCell>
                        <TableCell className="text-center">{t.totalSlots ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{t.registeredCount ?? 0}</span>
                          {(t.totalSlots ?? 0) > 0 && (
                            <span className="text-sm">/{t.totalSlots * t.swimmersPerSlot}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TryoutActions t={t} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Card list (mobile) ────────────────────────────────────────── */}
            <div className={`md:hidden flex flex-col gap-3 p-3 ${isFetching ? "opacity-60" : ""}`}>
              {tryouts.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 text-sm">
                  {hasActiveFilters
                    ? "No tryouts match your filters."
                    : "No tryouts yet. Create your first one!"}
                </div>
              ) : (
                tryouts.map((t) => (
                  <div
                    key={t._id}
                    className="rounded-lg border border-border bg-white p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/tryouts/view/${t._id}`}
                        className="font-medium hover:text-primary min-w-0"
                      >
                        <span className="truncate block">{t.name}</span>
                      </Link>
                      <TryoutActions t={t} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={statusVariant[t.status] ?? ""}>
                        {statusLabel(t.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{firstSessionDate(t)}</span>
                      {t.location && (
                        <span
                          className="text-xs text-muted-foreground truncate max-w-[120px]"
                          title={t.location}
                        >
                          · {t.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        <strong className="text-foreground">
                          {t.sessionCount ?? t.sessions?.length ?? 0}
                        </strong>{" "}
                        sessions
                      </span>
                      <span>
                        <strong className="text-foreground">{t.totalSlots ?? 0}</strong> slots
                      </span>
                      <span>
                        <strong className="text-foreground">{t.registeredCount ?? 0}</strong>
                        {(t.totalSlots ?? 0) > 0 && `/${t.totalSlots * t.swimmersPerSlot}`} reg
                      </span>
                    </div>
                    {t.segments && t.segments.length > 0 && <SegmentBadges segments={t.segments} />}
                  </div>
                ))
              )}
            </div>

            {/* ── Pagination footer ──────────────────────────────────────── */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground border-t border-border">
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
    </PageShell>
  );
}
