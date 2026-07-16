import { useState, useEffect, useRef } from "react";
import { Loader2, UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Template tokens ──────────────────────────────────────────────────────────

export const TEMPLATE_TOKENS = [
  { token: "{{swimmer_name}}", label: "Swimmer Name" },
  { token: "{{parent_name}}", label: "Parent Name" },
  { token: "{{parent_email}}", label: "Parent Email" },
  { token: "{{tryout_name}}", label: "Tryout Name" },
  { token: "{{club_name}}", label: "Club Name" },
  { token: "{{group_name}}", label: "Group Name" },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BulkEmailDialogProps {
  open: boolean;
  action: "offered" | "rejected" | null;
  count: number;
  onClose: () => void;
  onSend: (subject: string, body: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkEmailDialog({ open, action, count, onClose, onSend }: BulkEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editorData, setEditorData] = useState("");
  const [sending, setSending] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const activeFieldRef = useRef<"subject" | "body">("body");
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (open) {
      setSubject(
        action === "offered"
          ? "Congratulations {{swimmer_name}} – You've been offered a spot!"
          : "Tryout Update for {{swimmer_name}}",
      );
      setBody(
        action === "offered"
          ? "Hi {{parent_name}},\n\nCongratulations! We are pleased to offer {{swimmer_name}} a spot in the tryout at {{club_name}}.\n\nPlease reply to confirm your acceptance.\n\nBest regards,\nJustin Bilgri\nBilgrij@friscoisd.org\n{{club_name}}"
          : "Hi {{parent_name}},\n\nThank you for having {{swimmer_name}} participate. After careful review, we are unable to offer a spot at this time.\n\nBest regards,\nJustin Bilgri\nBilgrij@friscoisd.org\n{{club_name}}",
      );
    }
  }, [open, action]);

  function saveSubjectCursor() {
    activeFieldRef.current = "subject";
    const el = subjectRef.current;
    if (el)
      cursorPosRef.current = {
        start: el.selectionStart ?? subject.length,
        end: el.selectionEnd ?? subject.length,
      };
  }

  function saveBodyCursor() {
    activeFieldRef.current = "body";
    const ta = bodyRef.current;
    if (ta) cursorPosRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  }

  function insertToken(token: string) {
    const isSubject = activeFieldRef.current === "subject";
    const currentVal = isSubject ? subject : body;
    const pos = cursorPosRef.current;
    const start = pos?.start ?? currentVal.length;
    const end = pos?.end ?? currentVal.length;
    const next = currentVal.slice(0, start) + token + currentVal.slice(end);
    const newPos = start + token.length;
    cursorPosRef.current = { start: newPos, end: newPos };
    if (isSubject) {
      setSubject(next);
      requestAnimationFrame(() => {
        const el = subjectRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        }
      });
    } else {
      setBody(next);
      requestAnimationFrame(() => {
        const ta = bodyRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        }
      });
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      await onSend(subject, body);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {action === "offered" ? "Send Offer Email" : "Send Rejection Email"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({count} swimmer{count !== 1 ? "s" : ""})
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk-subject">Subject</Label>
              <select
                className="text-xs border border-blue-300 bg-blue-50 text-blue-700 rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue=""
                onFocus={saveSubjectCursor}
                onChange={(e) => {
                  if (e.target.value) {
                    insertToken(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  + Insert Variable
                </option>
                {TEMPLATE_TOKENS.map(({ token, label }) => (
                  <option key={token} value={token}>
                    {label} — {token}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="bulk-subject"
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onSelect={saveSubjectCursor}
              onClick={saveSubjectCursor}
              onKeyUp={saveSubjectCursor}
              onFocus={saveSubjectCursor}
              placeholder="Email subject…"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk-body">Email Body</Label>
              <select
                className="text-xs border border-blue-300 bg-blue-50 text-blue-700 rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                defaultValue=""
                onFocus={saveBodyCursor}
                onChange={(e) => {
                  if (e.target.value) {
                    insertToken(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  + Insert Variable
                </option>
                {TEMPLATE_TOKENS.map(({ token, label }) => (
                  <option key={token} value={token}>
                    {label} — {token}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              id="bulk-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onSelect={saveBodyCursor}
              onClick={saveBodyCursor}
              onKeyUp={saveBodyCursor}
              onFocus={saveBodyCursor}
              rows={9}
              placeholder="Write your email…"
              className="resize-none font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            disabled={!subject.trim() || !body.trim() || sending}
            onClick={handleSend}
            className={
              action === "offered"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
