import { useEffect, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmailPreview } from "@/hooks/use-tryout-dashboard";
import type { EmailPreview } from "@/lib/api/tryouts.api";
import { formatDateTimeWithRelative } from "@/lib/utils";

interface SentEmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tryoutId: string;
  regId: string | null;
  /** The decision that was already sent — drives which template is previewed. */
  action: "offered" | "rejected";
}

/**
 * Read-only dialog that shows the email that was already sent for an
 * offer/reject decision. Uses the same email-preview API (and therefore the
 * same template lookup + interpolation + renderLayout() as the real send
 * path), so the rendered subject + HTML body are faithful to what the parent
 * actually received.
 */
export function SentEmailPreviewDialog({
  open,
  onOpenChange,
  tryoutId,
  regId,
  action,
}: SentEmailPreviewDialogProps) {
  // Keep the last valid regId/action while the dialog is open OR during the
  // Radix close animation. The parent clears `regId` to null the moment the
  // user dismisses the dialog, which would otherwise change the email-preview
  // query key, drop the cached preview, and flash "No sent email found" before
  // the dialog finishes its exit animation.
  const lastRegId = useRef<string | null>(regId);
  const lastAction = useRef<"offered" | "rejected">(action);
  const [stableRegId, setStableRegId] = useState<string | null>(regId);
  const [stableAction, setStableAction] = useState<"offered" | "rejected">(action);

  useEffect(() => {
    if (open && regId) {
      lastRegId.current = regId;
      lastAction.current = action;
      setStableRegId(regId);
      setStableAction(action);
    } else if (!open) {
      // After close, reset to the last valid values so the body keeps showing
      // the previous preview during the exit animation instead of "No email".
      setStableRegId(lastRegId.current);
      setStableAction(lastAction.current);
    }
  }, [open, regId, action]);

  const { data: preview, isLoading: previewLoading } = useEmailPreview(
    tryoutId,
    stableRegId,
    stableAction,
    open && !!stableRegId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            Sent Email Preview
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                stableAction === "offered"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-500"
              }`}
            >
              {stableAction === "offered" ? "Offer" : "Reject"}
            </span>
          </DialogTitle>
          <DialogDescription>
            The email below was sent to the swimmer&rsquo;s parent.
          </DialogDescription>
        </DialogHeader>

        <EmailPreviewBody preview={preview} loading={previewLoading} />
      </DialogContent>
    </Dialog>
  );
}

function EmailPreviewBody({
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
        <span className="text-sm text-gray-400">Loading sent email…</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-400">No sent email found.</span>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      {preview.fromName || preview.fromEmail ? (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">From</div>
          <div className="text-sm font-semibold text-gray-800 wrap-break-word">
            {preview.fromName ? preview.fromName : ""}
            {preview.fromEmail ? ` <${preview.fromEmail}>` : ""}
          </div>
        </div>
      ) : null}

      {preview.sentAt ? (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Sent</div>
          <div className="text-sm font-semibold text-gray-800 wrap-break-word">
            {formatDateTimeWithRelative(preview.sentAt)}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Subject</div>
        <div className="text-sm font-semibold text-gray-800 wrap-break-word">{preview.subject}</div>
      </div>

      <div className="px-4 py-3 bg-white">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Body</div>
        <div className="ep-sent-preview max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-md border border-gray-100 bg-gray-50">
          <style>{`
            .ep-sent-preview table { width: 100% !important; max-width: 100% !important; }
            .ep-sent-preview td { word-wrap: break-word; overflow-wrap: anywhere; }
            .ep-sent-preview img { max-width: 100% !important; height: auto !important; }
            .ep-sent-preview body { margin: 0 !important; padding: 0 !important; background: transparent !important; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      </div>
    </div>
  );
}
