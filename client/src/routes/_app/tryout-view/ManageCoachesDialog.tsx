import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Trash2, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClubCoaches } from "@/hooks/use-clubs";
import { useTryout, useUpdateTryout } from "@/hooks/use-tryouts";
import type { CoachAssignment, CoachRole, LaneDetail } from "@/lib/api/tryouts.api";

const COACH_ROLES: CoachRole[] = ["Lead Coach", "Assistant Coach", "Evaluator"];
const MAX_LANE_NAME_LENGTH = 20;

type DraftAssignment = Omit<CoachAssignment, "_id"> & { _id?: string };

interface Props {
  tryoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function segmentKey(segment: { id?: string; name: string }) {
  return segment.id ?? segment.name;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  emptyText = "All",
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  const display =
    selected.length === 0
      ? emptyText
      : selected.length === 1
        ? (options.find((o) => o.id === selected[0])?.name ?? "1 selected")
        : `${selected.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">{display}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={selected.includes(option.id)}
            onCheckedChange={() => toggle(option.id)}
          >
            {option.name}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No {label} available</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ManageCoachesDialog({ tryoutId, open, onOpenChange }: Props) {
  const { data: tryout } = useTryout(tryoutId);
  const { data: coaches = [], isLoading: coachesLoading } = useClubCoaches();
  const updateTryout = useUpdateTryout(tryoutId);
  const [lanes, setLanes] = useState<LaneDetail[]>([]);
  const [assignments, setAssignments] = useState<DraftAssignment[]>([]);
  const [coachId, setCoachId] = useState("");
  const [role, setRole] = useState<CoachRole>(COACH_ROLES[0]);
  const [segmentIds, setSegmentIds] = useState<string[]>([]);
  const [laneIds, setLaneIds] = useState<string[]>([]);
  const [showAddRow, setShowAddRow] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<CoachRole>(COACH_ROLES[0]);
  const [editSegmentIds, setEditSegmentIds] = useState<string[]>([]);
  const [editLaneIds, setEditLaneIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !tryout) return;
    setLanes((tryout.laneDetails ?? []).map((lane) => ({ ...lane })));
    setAssignments((tryout.coachAssignments ?? []).map((assignment) => ({ ...assignment })));
    setCoachId("");
    setRole(COACH_ROLES[0]);
    setSegmentIds([]);
    setLaneIds([]);
    setShowAddRow(false);
    setEditingIndex(null);
    setEditRole(COACH_ROLES[0]);
    setEditSegmentIds([]);
    setEditLaneIds([]);
  }, [open, tryout]);

  const usedCoachIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.coachId)),
    [assignments],
  );
  const availableCoaches = coaches.filter((coach) => !usedCoachIds.has(coach._id));

  function addLane() {
    const hexId = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setLanes((current) => [
      ...current,
      { _id: hexId, name: `Lane ${current.length + 1}`, order: current.length + 1 },
    ]);
  }

  function removeLane(laneId: string) {
    setLanes((current) =>
      current
        .filter((lane) => lane._id !== laneId)
        .map((lane, index) => ({
          ...lane,
          order: index + 1,
          name: lane.name.match(/^Lane \d+$/) ? `Lane ${index + 1}` : lane.name,
        })),
    );
    setLaneIds((current) => current.filter((id) => id !== laneId));
  }

  function addAssignment() {
    if (!coachId) return;
    setAssignments((current) => [...current, { coachId, role, segmentIds, laneIds }]);
    setCoachId("");
    setRole(COACH_ROLES[0]);
    setSegmentIds([]);
    setLaneIds([]);
    setShowAddRow(false);
  }

  function startEdit(index: number) {
    const a = assignments[index];
    setEditingIndex(index);
    setEditRole(a.role);
    setEditSegmentIds([...a.segmentIds]);
    setEditLaneIds([...a.laneIds]);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditRole(COACH_ROLES[0]);
    setEditSegmentIds([]);
    setEditLaneIds([]);
  }

  function saveEdit(index: number) {
    setAssignments((current) =>
      current.map((a, i) =>
        i === index
          ? { ...a, role: editRole, segmentIds: editSegmentIds, laneIds: editLaneIds }
          : a,
      ),
    );
    cancelEdit();
  }

  function removeAssignment(index: number) {
    setAssignments((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    if (!tryout) return;
    try {
      await updateTryout.mutateAsync({
        laneDetails: lanes.map((lane, index) => ({ ...lane, order: index + 1 })),
        coachAssignments: assignments.map(({ _id: _assignmentId, ...assignment }) => assignment),
      });
      toast.success("Coach assignments saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save coach assignments");
    }
  }

  const allowToAddNewLanes = false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Manage coaches
          </DialogTitle>
          <DialogDescription>
            Assign club admins and coaches to tryout segments and pool lanes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <section className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Pool lanes</h3>
                {/* <p className="text-xs text-muted-foreground">
                  Edit, add, or remove lanes for this tryout.
                </p> */}
              </div>
              {allowToAddNewLanes && (
                <Button type="button" variant="outline" size="sm" onClick={addLane}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add lane
                </Button>
              )}
            </div>
            {lanes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">No lanes configured yet.</p>
                {allowToAddNewLanes && (
                  <Button type="button" variant="outline" size="sm" onClick={addLane}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add your first lane
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lanes.map((lane, index) => (
                  <div key={lane._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`lane-${lane._id}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Lane {index + 1}
                      </Label>
                      {allowToAddNewLanes && (
                        <button
                          type="button"
                          onClick={() => removeLane(lane._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove ${lane.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      id={`lane-${lane._id}`}
                      value={lane.name}
                      maxLength={MAX_LANE_NAME_LENGTH}
                      onChange={(event) =>
                        setLanes((current) =>
                          current.map((item) =>
                            item._id === lane._id ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    {lane.name.length >= MAX_LANE_NAME_LENGTH && (
                      <p className="text-xs text-destructive">
                        Lane name cannot exceed {MAX_LANE_NAME_LENGTH} characters.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Unified Coach Assignments ──────────────────────────────────── */}
          <section className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Coach assignments ({assignments.length})</h3>
                <p className="text-xs text-muted-foreground">
                  Assign coaches to segments and lanes. Leave unselected for full access.
                </p>
              </div>
              {!showAddRow && availableCoaches.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRow(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add coach
                </Button>
              )}
            </div>

            {assignments.length === 0 && !showAddRow ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">No coaches assigned yet.</p>
                {availableCoaches.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRow(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Assign your first coach
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {coachesLoading ? "Loading coaches…" : "All coaches have been assigned."}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* ── Inline add row ─────────────────────────────────────────── */}
                {showAddRow && (
                  <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.5fr)_130px_1fr_1fr_auto] gap-3 items-start">
                      <div className="space-y-1 min-w-0">
                        <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                          Coach
                        </Label>
                        <Select
                          value={coachId}
                          onValueChange={setCoachId}
                          disabled={availableCoaches.length === 0 || coachesLoading}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue
                              placeholder={
                                coachesLoading
                                  ? "Loading…"
                                  : availableCoaches.length === 0
                                    ? "No coaches"
                                    : "Choose coach"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCoaches.map((coach) => (
                              <SelectItem key={coach._id} value={coach._id}>
                                {`${coach.firstName} ${coach.lastName}`.trim() || coach.email} (
                                {coach.role === "admin" ? "Admin" : "Coach"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                          Role
                        </Label>
                        <Select value={role} onValueChange={(value) => setRole(value as CoachRole)}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COACH_ROLES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                          Segments
                        </Label>
                        <MultiSelectDropdown
                          label="segments"
                          options={(tryout?.segments ?? []).map((segment) => ({
                            id: segmentKey(segment),
                            name: segment.name,
                          }))}
                          selected={segmentIds}
                          onChange={setSegmentIds}
                          emptyText="All segments"
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                          Lanes
                        </Label>
                        <MultiSelectDropdown
                          label="lanes"
                          options={lanes.map((lane) => ({ id: lane._id, name: lane.name }))}
                          selected={laneIds}
                          onChange={setLaneIds}
                          emptyText="All lanes"
                        />
                      </div>

                      <div className="flex items-end gap-1 h-full pt-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddRow(false);
                            setCoachId("");
                            setRole(COACH_ROLES[0]);
                            setSegmentIds([]);
                            setLaneIds([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={addAssignment} disabled={!coachId}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Assigned coach rows ────────────────────────────────────── */}
                {assignments.map((assignment, index) => {
                  const coach = coaches.find((item) => item._id === assignment.coachId);
                  const isEditing = editingIndex === index;

                  if (isEditing) {
                    return (
                      <div
                        key={assignment._id ?? `${assignment.coachId}-${index}`}
                        className="rounded-md border-2 border-primary/30 bg-primary/5 p-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.5fr)_130px_1fr_1fr_auto] gap-3 items-start">
                          <div className="space-y-1 min-w-0">
                            <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                              Coach
                            </Label>
                            <div className="text-sm font-medium truncate">
                              {coach
                                ? `${coach.firstName} ${coach.lastName}`.trim() || coach.email
                                : "Unknown"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {coach?.email}
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                              Role
                            </Label>
                            <Select
                              value={editRole}
                              onValueChange={(value) => setEditRole(value as CoachRole)}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COACH_ROLES.map((item) => (
                                  <SelectItem key={item} value={item}>
                                    {item}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                              Segments
                            </Label>
                            <MultiSelectDropdown
                              label="segments"
                              options={(tryout?.segments ?? []).map((segment) => ({
                                id: segmentKey(segment),
                                name: segment.name,
                              }))}
                              selected={editSegmentIds}
                              onChange={setEditSegmentIds}
                              emptyText="All segments"
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                              Lanes
                            </Label>
                            <MultiSelectDropdown
                              label="lanes"
                              options={lanes.map((lane) => ({ id: lane._id, name: lane.name }))}
                              selected={editLaneIds}
                              onChange={setEditLaneIds}
                              emptyText="All lanes"
                            />
                          </div>

                          <div className="flex items-end gap-1 h-full pt-5">
                            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                              Cancel
                            </Button>
                            <Button type="button" size="sm" onClick={() => saveEdit(index)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const names = assignment.segmentIds
                    .map(
                      (id) => tryout?.segments.find((segment) => segmentKey(segment) === id)?.name,
                    )
                    .filter(Boolean);
                  const laneNames = assignment.laneIds
                    .map((id) => lanes.find((lane) => lane._id === id)?.name)
                    .filter(Boolean);

                  return (
                    <div
                      key={assignment._id ?? `${assignment.coachId}-${index}`}
                      className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.5fr)_130px_1fr_1fr_auto] gap-3 items-start rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {coach
                            ? `${coach.firstName} ${coach.lastName}`.trim() || coach.email
                            : "Unknown"}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {coach?.email}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {assignment.role}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 min-w-0">
                        {names.length ? (
                          names.map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs truncate max-w-[120px]"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All segments</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 min-w-0">
                        {laneNames.length ? (
                          laneNames.map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 truncate max-w-[120px]"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All lanes</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(index)}
                          aria-label="Edit coach assignment"
                        >
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAssignment(index)}
                          aria-label="Remove coach assignment"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updateTryout.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={updateTryout.isPending}>
            {updateTryout.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save
            changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
