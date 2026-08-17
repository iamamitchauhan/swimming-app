import { useEffect, useRef, useState } from "react";
import { Info, Loader2, Mail } from "lucide-react";
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
import { useEmailPreview } from "@/hooks/use-tryout-dashboard";
import type { EmailPreview } from "@/lib/api/tryouts.api";

interface DecisionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "offered" | "rejected" | null;
  onConfirm: () => void;
  isPending: boolean;
  /** Tryout the registration belongs to. */
  tryoutId: string;
  /** Single-registration ID (when acting on one swimmer). Null for bulk. */
  regId: string | null;
  /** Number of swimmers selected in bulk. 0 or 1 → single mode (show preview). */
  selectedCount: number;
}

/**
 * Shared offer/reject confirmation dialog.
 *
 * When acting on a single swimmer (regId set OR selectedCount === 1) it
 * fetches an email preview from the backend — the exact subject, text, and
 * HTML that would be sent — and renders it inside the dialog. For bulk
 * actions (>1) it shows the count only, no preview.
 *
 * The preview is generated server-side using the same template lookup,
 * interpolation, and renderLayout() as the real decision endpoint, so it
 * is always faithful to what the parent will receive.
 */
export function DecisionConfirmDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  isPending,
  tryoutId,
  regId,
  selectedCount,
}: DecisionConfirmDialogProps) {
  // Keep the last valid regId/action while the dialog is open OR during the
  // Radix close animation. The parent clears `regId`/`action` to null the
  // moment the user dismisses the dialog, which would otherwise change the
  // email-preview query key, drop the cached preview, and flash the empty
  // "No email preview available" state before the dialog finishes its exit
  // animation.
  const lastRegId = useRef<string | null>(regId);
  const lastAction = useRef<"offered" | "rejected">(action ?? "offered");
  const [stableRegId, setStableRegId] = useState<string | null>(regId);
  const [stableAction, setStableAction] = useState<"offered" | "rejected" | null>(action);
  // Track whether the current/last open was a single-swimmer action. This
  // must be derived from the live props while the dialog is open (so bulk
  // mode is detected correctly) and frozen during the close animation so
  // the layout doesn't flip.
  const [stableIsSingle, setStableIsSingle] = useState<boolean>(!!regId || selectedCount === 1);

  useEffect(() => {
    if (open) {
      const isSingle = !!regId || selectedCount === 1;
      setStableIsSingle(isSingle);
      // Always track the current action so bulk mode (regId null) still
      // shows the correct title/button color. For single mode, also persist
      // regId so the email-preview query key stays stable.
      if (action) {
        lastAction.current = action;
        setStableAction(action);
      }
      if (regId) {
        lastRegId.current = regId;
        setStableRegId(regId);
      }
    } else if (!open) {
      // After close, reset to the last valid values so the body keeps showing
      // the previous preview during the exit animation instead of the empty state.
      setStableRegId(lastRegId.current);
      setStableAction(lastAction.current);
    }
  }, [open, regId, action, selectedCount]);

  const isSingle = stableIsSingle;

  // Fetch the email preview from the backend (only for single-swimmer actions)
  const { data: preview, isLoading: previewLoading } = useEmailPreview(
    tryoutId,
    stableRegId,
    stableAction,
    open && isSingle,
  );

  const description = isSingle
    ? `Are you sure you want to ${stableAction === "offered" ? "offer" : "reject"} this swimmer?`
    : `Are you sure you want to ${stableAction === "offered" ? "offer" : "reject"} the ${selectedCount} selected swimmers?`;

  const stableActionText = stableAction === "offered" ? "Offer" : "Reject";
  // Bulk mode (>1 swimmer): no per-swimmer email preview is available.
  // Show a dedicated heading + info card instead of the single-swimmer copy.
  const isBulk = !isSingle;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={
          isSingle ? "w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto" : "w-[92vw] max-w-lg"
        }
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBulk
              ? "Email Preview Not Available for bulk action"
              : `Email Preview for ${stableActionText}`}
          </AlertDialogTitle>
          {/* <AlertDialogDescription>
            {isBulk ? "Multiple swimmers are selected." : description}
          </AlertDialogDescription> */}
        </AlertDialogHeader>

        {isSingle && <EmailPreviewSection preview={preview} loading={previewLoading} />}
        {isBulk && <BulkNoPreviewSection action={stableAction} />}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={
              stableAction === "offered"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Send Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Bulk "no preview" card ──────────────────────────────────────────────────

function BulkNoPreviewSection({ action }: { action: "offered" | "rejected" | null }) {
  const isOffer = action === "offered";
  const label = isOffer ? "offer" : "rejection";
  const verb = isOffer ? "Offer" : "Reject";
  return (
    <div className="my-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm text-gray-700">
          <p>Email preview is not available when multiple swimmers are selected.</p>
          <p>
            To preview a {label} email, click the <span className="font-semibold">{verb}</span>{" "}
            button on an individual swimmer&rsquo;s row.
          </p>
          <p>
            You can still send the {label} to all selected swimmers in bulk by pressing the{" "}
            <span className="font-semibold">Send Now</span> button.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Email preview card ──────────────────────────────────────────────────────

function EmailPreviewSection({
  preview,
  loading,
}: {
  preview: EmailPreview | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-400">Loading email preview…</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-400">No email preview available.</span>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      {/* <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Email Preview
        </span>
        <span
          className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            preview.isCustom ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {preview.isCustom ? "Custom template" : "Default template"}
        </span>
      </div> */}

      {preview.fromName || preview.fromEmail ? (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">From</div>
          <div className="text-sm font-semibold text-gray-800 wrap-break-word">
            {preview.fromName ? preview.fromName : ""}
            {preview.fromEmail ? ` <${preview.fromEmail}>` : ""}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Subject</div>
        <div className="text-sm font-semibold text-gray-800 wrap-break-word">{preview.subject}</div>
      </div>

      <div className="px-4 py-3 bg-white">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Body</div>
        {/* Render the actual HTML the server would send (same template +
            renderLayout() output) so the preview is visually faithful to the
            delivered email. A scoped <style> block overrides the email's
            fixed 600px table layout to be responsive inside the dialog, and
            overflow-x-hidden is a safety net against any residual overflow. */}
        <div className="ep-preview max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-md border border-gray-100 bg-gray-50">
          <style>{`
            .ep-preview table { width: 100% !important; max-width: 100% !important; }
            .ep-preview td { word-wrap: break-word; overflow-wrap: anywhere; }
            .ep-preview img { max-width: 100% !important; height: auto !important; }
            .ep-preview body { margin: 0 !important; padding: 0 !important; background: transparent !important; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      </div>
    </div>
  );
}
