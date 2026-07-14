import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/use-groups";
import { useAuthStore } from "@/lib/auth.store";
import type { Group } from "@/lib/api/groups.api";

const DEFAULT_GROUP_COLOR = "#6366f1";

export default function GroupsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const { data: groups, isLoading, isError } = useGroups();

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_GROUP_COLOR);
  const [newDescription, setNewDescription] = useState("");

  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_GROUP_COLOR);
  const [editDescription, setEditDescription] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createGroup.mutate(
      { name: newName.trim(), color: newColor, description: newDescription.trim() },
      {
        onSuccess: () => {
          setNewName("");
          setNewColor(DEFAULT_GROUP_COLOR);
          setNewDescription("");
          setIsAddOpen(false);
        },
      },
    );
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup || !editName.trim()) return;
    updateGroup.mutate(
      {
        id: editGroup._id,
        input: { name: editName.trim(), color: editColor, description: editDescription.trim() },
      },
      {
        onSuccess: () => {
          setEditGroup(null);
          setEditName("");
          setEditColor(DEFAULT_GROUP_COLOR);
          setEditDescription("");
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteGroup.mutate(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const formatDate = (value: string) => new Date(value).toLocaleString();

  const creatorName = (g: Group) => {
    const full = `${g.createdBy.firstName ?? ""} ${g.createdBy.lastName ?? ""}`.trim();
    return full || g.createdBy.email || "—";
  };

  const colorSwatch = (color?: string) => (
    <div
      className="h-4 w-4 rounded-full border border-gray-200 shrink-0"
      style={{ backgroundColor: color || "#e5e7eb" }}
      aria-hidden="true"
    />
  );

  return (
    <PageShell title="Groups">
      <div className="flex justify-end pb-4">
        {isAdmin && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add new group
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border">
        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <XCircle className="h-8 w-8" />
            <p className="text-sm">Failed to load groups. Please refresh.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-900 text-xs uppercase tracking-wide">
                <TableRow>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Description</TableHead>
                  <TableHead className="text-white">Created by</TableHead>
                  <TableHead className="text-white">Updated at</TableHead>
                  {isAdmin && <TableHead className="w-32 text-white">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 5 : 4}
                      className="text-center text-muted-foreground py-10 align-middle"
                    >
                      No groups found.
                    </TableCell>
                  </TableRow>
                )}
                {groups?.map((group) => (
                  <TableRow key={group._id}>
                    <TableCell className="font-medium align-middle">
                      <div className="flex items-center gap-2">
                        {colorSwatch(group.color)}
                        {group.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">
                      <p className="text-sm line-clamp-2 max-w-md">{group.description}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">
                      {creatorName(group)}
                    </TableCell>
                    <TableCell className="text-muted-foreground align-middle">
                      {formatDate(group.updatedAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditGroup(group);
                              setEditName(group.name);
                              setEditColor(group.color || DEFAULT_GROUP_COLOR);
                              setEditDescription(group.description || "");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(group)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Group Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(v) => !v && setIsAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add new group
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Platinum"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-color">Color</Label>
              <Input
                id="group-color"
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-10 w-full p-1 cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional group description"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGroup.isPending || !newName.trim()}>
                {createGroup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(v) => !v && setEditGroup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Rename group
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-name">Group name</Label>
              <Input
                id="edit-group-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-color">Color</Label>
              <Input
                id="edit-group-color"
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-10 w-full p-1 cursor-pointer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-description">Description</Label>
              <Textarea
                id="edit-group-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional group description"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditGroup(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateGroup.isPending || !editName.trim()}>
                {updateGroup.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete group
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
