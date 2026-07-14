import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, UserCog, X } from "lucide-react";
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

type DraftAssignment = Omit<CoachAssignment, "_id"> & { _id?: string };

interface Props {
  tryoutId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function segmentKey(segment: { id?: string; name: string }) {
  return segment.id ?? segment.name;
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

  useEffect(() => {
    if (!open || !tryout) return;
    setLanes((tryout.laneDetails ?? []).map((lane) => ({ ...lane })));
    setAssignments((tryout.coachAssignments ?? []).map((assignment) => ({ ...assignment })));
    setCoachId("");
    setRole(COACH_ROLES[0]);
    setSegmentIds([]);
    setLaneIds([]);
  }, [open, tryout]);

  const usedCoachIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.coachId)),
    [assignments],
  );
  const availableCoaches = coaches.filter((coach) => !usedCoachIds.has(coach._id));

  function toggleValue(values: string[], value: string, setValue: (next: string[]) => void) {
    setValue(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

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
    setSegmentIds([]);
    setLaneIds([]);
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
                      onChange={(event) =>
                        setLanes((current) =>
                          current.map((item) =>
                            item._id === lane._id ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Add a coach</h3>
                <p className="text-xs text-muted-foreground">
                  Assign a coach to specific segments and lanes.
                </p>
              </div>
            </div>

            {/* Coach + Role row */}
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Coach</Label>
                <Select
                  value={coachId}
                  onValueChange={setCoachId}
                  disabled={availableCoaches.length === 0 || coachesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        coachesLoading
                          ? "Loading coaches…"
                          : availableCoaches.length === 0
                            ? "No coaches available"
                            : "Choose a coach or admin"
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
                {availableCoaches.length === 0 && !coachesLoading && (
                  <p className="text-xs text-muted-foreground">All coaches have been assigned.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as CoachRole)}>
                  <SelectTrigger className="w-full">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Segments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Segments</Label>
                  {segmentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSegmentIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(tryout?.segments ?? []).map((segment) => {
                    const id = segmentKey(segment);
                    const selected = segmentIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleValue(segmentIds, id, setSegmentIds)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
                      >
                        {segment.name}
                      </button>
                    );
                  })}
                  {(tryout?.segments ?? []).length === 0 && (
                    <span className="text-sm text-muted-foreground">No segments defined.</span>
                  )}
                </div>
              </div>

              {/* Lanes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Lanes</Label>
                  {laneIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLaneIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lanes.map((lane) => {
                    const selected = laneIds.includes(lane._id);
                    return (
                      <button
                        key={lane._id}
                        type="button"
                        onClick={() => toggleValue(laneIds, lane._id, setLaneIds)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
                      >
                        {lane.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Leave segments or lanes unselected for full access.
              </p>
              <Button type="button" onClick={addAssignment} disabled={!coachId} size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add coach
              </Button>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Assigned coaches ({assignments.length})</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No coaches assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment, index) => {
                  const coach = coaches.find((item) => item._id === assignment.coachId);
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
                      className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-44 flex-1">
                        <div className="font-medium">
                          {coach
                            ? `${coach.firstName} ${coach.lastName}`.trim() || coach.email
                            : "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{coach?.email}</div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {assignment.role}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {names.length ? (
                          names.map((name) => (
                            <span key={name} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All segments</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {laneNames.length ? (
                          laneNames.map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All lanes</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAssignments((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        aria-label="Remove coach assignment"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
