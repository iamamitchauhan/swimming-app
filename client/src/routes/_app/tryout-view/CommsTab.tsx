import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFetchGroup } from "@/hooks/use-clubs";
import { useSaveEmailTemplates } from "@/hooks/use-email-templates";
import { useAuthStore } from "@/lib/auth.store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATE_TOKENS } from "./BulkEmailDialog";

// ─── Templates ────────────────────────────────────────────────────────────────

const COMM_TEMPLATES: Record<
  string,
  { label: string; sub: string; subject: string; body: string }
> = {
  offer: {
    label: "Offer",
    sub: "Send an offer",
    subject: "🎉 You've been offered a spot!",
    body: "Dear {{parent_name}},\n\nWe are thrilled to offer {{swimmer_name}} a spot on our team!\n\nPlease confirm your acceptance within 48 hours.\n\nBest,\nThe Coaching Team",
  },
  rejection: {
    label: "Rejection",
    sub: "Decline politely",
    subject: "Tryout Result for {{swimmer_name}}",
    body: "Dear {{parent_name}},\n\nThank you for participating in our tryout. After careful evaluation, we are unable to offer {{swimmer_name}} a spot at this time.\n\nWe encourage you to try again next season.\n\nBest regards,\nThe Coaching Team",
  },
  // reminder: {
  //   label: "Reminder",
  //   sub: "Upcoming tryout",
  //   subject: "Reminder: Tryout coming up!",
  //   body: "Dear {parent_name},\n\nThis is a friendly reminder that {swimmer_name}'s tryout is coming up soon.\n\nPlease make sure to arrive 15 minutes early.\n\nSee you there!\nThe Coaching Team",
  // },
  // general: {
  //   label: "General",
  //   sub: "Custom message",
  //   subject: "",
  //   body: "",
  // },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommsTab({ tryoutId: _tryoutId }: Props) {
  const { data: groupData, isLoading: groupLoading } = useFetchGroup();
  const { mutate: saveTemplates, isPending: saving } = useSaveEmailTemplates();
  const clubId = useAuthStore((s) => s.user?.clubId);

  console.log("groupData", { groupData, groupLoading });

  const [commTemplate, setCommTemplate] = useState("general");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [commSubject, setCommSubject] = useState("");
  const [commBody, setCommBody] = useState("");
  const [groupComms, setGroupComms] = useState<Record<string, { subject: string; body: string }>>(
    {},
  );

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const activeFieldRef = useRef<"subject" | "body">("body");
  const cursorPosRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (!selectedGroup && groupData?.length) {
      const first = groupData[0]._id;
      setSelectedGroup(first);
      const saved = groupComms[first];
      setCommSubject(saved?.subject ?? "");
      setCommBody(saved?.body ?? "");
    }
  }, [groupData, groupComms, selectedGroup]);

  function handleSelectGroup(groupId: string) {
    if (selectedGroup) {
      setGroupComms((prev) => ({
        ...prev,
        [selectedGroup]: { subject: commSubject, body: commBody },
      }));
    }
    setSelectedGroup(groupId);
    const saved = groupComms[groupId];
    setCommSubject(saved?.subject ?? "");
    setCommBody(saved?.body ?? "");
  }

  function switchTemplate(key: string) {
    setCommTemplate(key);
    const tmpl = COMM_TEMPLATES[key];
    if (tmpl.subject) setCommSubject(tmpl.subject);
    if (tmpl.body) setCommBody(tmpl.body);
  }

  function saveSubjectCursor() {
    activeFieldRef.current = "subject";
    const el = subjectRef.current;
    if (el)
      cursorPosRef.current = {
        start: el.selectionStart ?? commSubject.length,
        end: el.selectionEnd ?? commSubject.length,
      };
  }

  function saveBodyCursor() {
    activeFieldRef.current = "body";
    const ta = bodyRef.current;
    if (ta) cursorPosRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  }

  function insertToken(token: string) {
    const isSubject = activeFieldRef.current === "subject";
    const currentVal = isSubject ? commSubject : commBody;
    const pos = cursorPosRef.current;
    const start = pos?.start ?? currentVal.length;
    const end = pos?.end ?? currentVal.length;
    const next = currentVal.slice(0, start) + token + currentVal.slice(end);
    const newPos = start + token.length;
    cursorPosRef.current = { start: newPos, end: newPos };
    if (isSubject) {
      setCommSubject(next);
      requestAnimationFrame(() => {
        const el = subjectRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newPos, newPos);
        }
      });
    } else {
      setCommBody(next);
      requestAnimationFrame(() => {
        const ta = bodyRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        }
      });
    }
  }

  function buildTemplatesForSave() {
    const templates = Object.entries(groupComms).map(([groupId, { subject, body }]) => ({
      groupId,
      subject,
      body,
    }));

    if (selectedGroup) {
      const existingIndex = templates.findIndex((t) => t.groupId === selectedGroup);
      const entry = { groupId: selectedGroup, subject: commSubject, body: commBody };
      if (existingIndex >= 0) {
        templates[existingIndex] = entry;
      } else {
        templates.push(entry);
      }
    }

    return templates;
  }

  function handleSave() {
    if (!clubId) {
      toast.error("No club selected.");
      return;
    }

    const templates = buildTemplatesForSave();
    if (templates.length === 0) {
      toast.error("No templates to save.");
      return;
    }

    saveTemplates(
      { templates },
      {
        onSuccess: () => toast.success("Templates saved successfully"),
        onError: () => toast.error("Failed to save templates."),
      },
    );
  }

  return (
    <div className="p-5">
      {/* Template picker */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Pick a template
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {Object.entries(COMM_TEMPLATES).map(([key, tmpl]) => (
          <button
            key={key}
            onClick={() => switchTemplate(key)}
            className={`text-left p-3 rounded-xl border-2 transition ${
              commTemplate === key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <div
              className={`font-semibold text-sm ${commTemplate === key ? "text-white" : "text-gray-800"}`}
            >
              {tmpl.label}
            </div>
            <div
              className={`text-xs mt-0.5 ${commTemplate === key ? "text-gray-300" : "text-gray-400"}`}
            >
              {tmpl.sub}
            </div>
          </button>
        ))}
      </div>

      {/* Group tabs */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Group</div>
      {groupLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading groups…
        </div>
      ) : groupData?.length ? (
        <Tabs value={selectedGroup} onValueChange={handleSelectGroup} className="mb-5">
          <TabsList>
            {groupData.map((group: any) => (
              <TabsTrigger key={group._id} value={group._id}>
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <div className="text-sm text-gray-500 mb-5">No groups available.</div>
      )}

      {/* Subject */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Subject</span>
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
        <input
          ref={subjectRef}
          name="comm-subject-line"
          autoComplete="off"
          spellCheck={false}
          value={commSubject}
          onChange={(e) => setCommSubject(e.target.value)}
          onSelect={saveSubjectCursor}
          onClick={saveSubjectCursor}
          onKeyUp={saveSubjectCursor}
          onFocus={saveSubjectCursor}
          placeholder="Email subject…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Email Body</span>
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
        <textarea
          ref={bodyRef}
          name="comm-body-text"
          autoComplete="off"
          spellCheck={false}
          value={commBody}
          onChange={(e) => setCommBody(e.target.value)}
          onSelect={saveBodyCursor}
          onClick={saveBodyCursor}
          onKeyUp={saveBodyCursor}
          onFocus={saveBodyCursor}
          rows={12}
          placeholder="Write your email…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !selectedGroup}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save templates
      </button>
    </div>
  );
}
