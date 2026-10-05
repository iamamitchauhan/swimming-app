import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDeleteScoringQuestionsMutation,
  useDownloadScoringQuestionTemplateMutation,
  useSaveSegmentQuestionsMutation,
  useScoringQuestionBankQuery,
  useScoringQuestionImportMutation,
  useScoringQuestionPreviewMutation,
  useSegmentQuestionsQuery,
} from "@/hooks/use-scoring-questions";
import type { ScoringQuestionPreview } from "@/lib/api/scoring-questions.api";
import type { Tryout } from "@/lib/api/tryouts.api";
import { QuestionsDropzone } from "./questions/QuestionsDropzone";
import { QuestionsTable } from "./questions/QuestionsTable";
import { AddToGroupsDialog } from "./questions/AddToGroupsDialog";
import { ManageBankDialog } from "./questions/ManageBankDialog";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const TYPE_LABEL = {
  YESNO: "Yes / No",
  RATING: "Rate 1–5",
  TEXT: "Text",
} as const;

function validateSheetFile(file: File): string | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `File type ${ext} is not supported. Please upload a CSV or Excel file.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`;
  }
  return null;
}

/** Question-centric view of the club bank, with per-tryout age-group assignment. */
export function SegmentQuestionsTab({ tryout }: { tryout: Tryout }) {
  const clubId = tryout.clubId;
  const segments = tryout.segments ?? [];

  const { data: bank = [], isLoading: bankLoading } = useScoringQuestionBankQuery(clubId);
  const { data: segmentQuestions = [], isLoading: selectionsLoading } = useSegmentQuestionsQuery(
    tryout._id,
  );

  const previewMutation = useScoringQuestionPreviewMutation(clubId);
  const importMutation = useScoringQuestionImportMutation(clubId);
  const removeFromBankMutation = useDeleteScoringQuestionsMutation(clubId);
  const saveMutation = useSaveSegmentQuestionsMutation(tryout._id);
  const templateMutation = useDownloadScoringQuestionTemplateMutation();

  const assignment = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of segmentQuestions) {
      for (const question of entry.questions) {
        const set = map.get(question._id) ?? new Set<string>();
        set.add(entry.segmentId);
        map.set(question._id, set);
      }
    }
    return map;
  }, [segmentQuestions]);

  const countsBySegment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of segmentQuestions) counts[entry.segmentId] = entry.questions.length;
    return counts;
  }, [segmentQuestions]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToGroupsOpen, setAddToGroupsOpen] = useState(false);
  const [manageBankOpen, setManageBankOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string[] | null>(null);
  const [pendingBankRemoval, setPendingBankRemoval] = useState<string[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScoringQuestionPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleSelectFile(file);
  }

  function handleSelectFile(file: File) {
    const error = validateSheetFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    setPendingFile(file);
    previewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setPreviewOpen(true);
      },
      onError: (err) =>
        setFileError(err instanceof Error ? err.message : "Failed to read the file."),
    });
  }

  function confirmImport() {
    if (!pendingFile) return;
    importMutation.mutate(pendingFile, {
      onSuccess: () => {
        setPreviewOpen(false);
        setPendingFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  function downloadTemplate() {
    templateMutation.mutate(clubId, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "scoring-questions-template.csv";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
    });
  }

  function persist(next: Map<string, Set<string>>) {
    saveMutation.mutate(
      segments.map((segment) => {
        const key = segment.id ?? segment.name;
        return {
          segmentId: key,
          questionIds: bank
            .filter((question) => next.get(question._id)?.has(key))
            .map((question) => question._id),
        };
      }),
    );
  }

  function addSelectedToSegments(segmentIds: string[]) {
    const next = new Map(assignment);
    for (const id of selectedIds) {
      const set = new Set(next.get(id) ?? []);
      for (const segmentId of segmentIds) set.add(segmentId);
      next.set(id, set);
    }
    persist(next);
    setAddToGroupsOpen(false);
    setSelectedIds(new Set());
  }

  function unassign(questionIds: string[]) {
    const next = new Map(assignment);
    for (const id of questionIds) next.delete(id);
    persist(next);
    setPendingRemoval(null);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  if (bankLoading || selectionsLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const isBusy = previewMutation.isPending || importMutation.isPending;

  return (
    <div className="space-y-5 p-5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {bank.length === 0 ? (
        <QuestionsDropzone
          onSelectFile={handleSelectFile}
          onPickFile={pickFile}
          onDownloadTemplate={downloadTemplate}
          isPreviewing={isBusy}
          isDownloading={templateMutation.isPending}
          error={fileError}
        />
      ) : (
        <QuestionsTable
          questions={bank}
          segments={segments}
          assignment={assignment}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          onRemoveQuestion={(id) => setPendingRemoval([id])}
          onAddToGroups={() => setAddToGroupsOpen(true)}
          onRemoveSelected={() => setPendingRemoval([...selectedIds])}
          onUploadMore={pickFile}
          onManageBank={() => setManageBankOpen(true)}
          isSaving={saveMutation.isPending}
        />
      )}

      <AddToGroupsDialog
        open={addToGroupsOpen}
        onOpenChange={setAddToGroupsOpen}
        questionCount={selectedIds.size}
        segments={segments}
        countsBySegment={countsBySegment}
        onSave={addSelectedToSegments}
        isSaving={saveMutation.isPending}
      />

      <ManageBankDialog
        open={manageBankOpen}
        onOpenChange={setManageBankOpen}
        questions={bank}
        onDelete={(ids) => setPendingBankRemoval(ids)}
        isDeleting={removeFromBankMutation.isPending}
      />

      <AlertDialog
        open={pendingBankRemoval !== null}
        onOpenChange={(next) => !next && setPendingBankRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBankRemoval && pendingBankRemoval.length > 1
                ? `Delete ${pendingBankRemoval.length} questions from the bank?`
                : "Delete question from the bank?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from the club bank everywhere, including other tryouts that use
              them. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeFromBankMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeFromBankMutation.isPending}
              onClick={() => {
                if (!pendingBankRemoval) return;
                removeFromBankMutation.mutate(pendingBankRemoval, {
                  onSuccess: () => {
                    setPendingBankRemoval(null);
                    setManageBankOpen(false);
                  },
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => !next && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemoval && pendingRemoval.length > 1
                ? `Remove ${pendingRemoval.length} questions?`
                : "Remove question?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This only removes them from this tryout's age groups. The questions stay in the club
              bank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saveMutation.isPending}
              onClick={() => pendingRemoval && unassign(pendingRemoval)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(next) => !importMutation.isPending && setPreviewOpen(next)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import preview</DialogTitle>
            <DialogDescription>
              Review the sheet before adding questions to the club bank. Duplicates are skipped.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3 py-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preview.totalRows} row(s)</Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {preview.valid} new
                </Badge>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {preview.duplicates} duplicate(s)
                </Badge>
                {preview.errors.length > 0 && (
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                    {preview.errors.length} error(s)
                  </Badge>
                )}
              </div>

              {preview.rows.length > 0 && (
                <ul className="max-h-56 space-y-1 overflow-auto rounded-lg border p-2 text-sm">
                  {preview.rows.map((row) => (
                    <li key={row.row} className="flex items-center justify-between gap-2 px-1">
                      <span className="min-w-0 truncate">{row.label}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                        {TYPE_LABEL[row.type]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              {preview.errors.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-rose-200 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {preview.errors.map((error) => (
                    <li key={`${error.row}-${error.message}`}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importMutation.isPending || !preview || preview.valid === 0}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import {preview?.valid ?? 0} question{preview?.valid === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
