import { useState } from "react";
import type { Registration } from "@/lib/api/tryouts.api";

// ─── Templates ────────────────────────────────────────────────────────────────

const COMM_TEMPLATES: Record<string, { label: string; sub: string; subject: string; body: string }> = {
  offer: {
    label: "Offer",
    sub: "Send an offer",
    subject: "🎉 You've been offered a spot!",
    body: "Dear {parent_name},\n\nWe are thrilled to offer {swimmer_name} a spot on our team!\n\nPlease confirm your acceptance within 48 hours.\n\nBest,\nThe Coaching Team",
  },
  rejection: {
    label: "Rejection",
    sub: "Decline politely",
    subject: "Tryout Result for {swimmer_name}",
    body: "Dear {parent_name},\n\nThank you for participating in our tryout. After careful evaluation, we are unable to offer {swimmer_name} a spot at this time.\n\nWe encourage you to try again next season.\n\nBest regards,\nThe Coaching Team",
  },
  reminder: {
    label: "Reminder",
    sub: "Upcoming tryout",
    subject: "Reminder: Tryout coming up!",
    body: "Dear {parent_name},\n\nThis is a friendly reminder that {swimmer_name}'s tryout is coming up soon.\n\nPlease make sure to arrive 15 minutes early.\n\nSee you there!\nThe Coaching Team",
  },
  general: {
    label: "General",
    sub: "Custom message",
    subject: "",
    body: "",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  roster: Registration[];
  waitlisted: Registration[];
  onSend: (params: {
    audience: string;
    subject: string;
    body: string;
    recipients: Registration[];
  }) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommsTab({ roster, waitlisted, onSend }: Props) {
  const [commTemplate, setCommTemplate] = useState("general");
  const [commAudience, setCommAudience] = useState("all");
  const [commSubject, setCommSubject]   = useState("");
  const [commBody, setCommBody]         = useState("");
  const [sending, setSending]           = useState(false);

  function switchTemplate(key: string) {
    setCommTemplate(key);
    const tmpl = COMM_TEMPLATES[key];
    if (tmpl.subject) setCommSubject(tmpl.subject);
    if (tmpl.body) setCommBody(tmpl.body);
  }

  function getRecipients() {
    const registered = roster.filter((r) => r.status !== "waitlisted");
    switch (commAudience) {
      case "offered":    return roster.filter((r) => r.status === "offered");
      case "rejected":   return roster.filter((r) => r.status === "rejected");
      case "waitlisted": return waitlisted;
      case "registered": return roster.filter((r) => r.status === "registered");
      default:           return registered;
    }
  }

  const recipients = getRecipients();
  const registered = roster.filter((r) => r.status !== "waitlisted");

  async function handleSend() {
    if (!commSubject.trim() || !commBody.trim()) return;
    setSending(true);
    try {
      await onSend({ audience: commAudience, subject: commSubject, body: commBody, recipients });
    } finally {
      setSending(false);
    }
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
            <div className={`font-semibold text-sm ${commTemplate === key ? "text-white" : "text-gray-800"}`}>
              {tmpl.label}
            </div>
            <div className={`text-xs mt-0.5 ${commTemplate === key ? "text-gray-300" : "text-gray-400"}`}>
              {tmpl.sub}
            </div>
          </button>
        ))}
      </div>

      {/* Audience */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Audience</span>
          <select
            value={commAudience}
            onChange={(e) => setCommAudience(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All swimmers ({registered.length})</option>
            <option value="offered">Offered swimmers ({roster.filter((r) => r.status === "offered").length})</option>
            <option value="rejected">Rejected swimmers ({roster.filter((r) => r.status === "rejected").length})</option>
            <option value="waitlisted">Waitlisted ({waitlisted.length})</option>
            <option value="registered">Registered only ({roster.filter((r) => r.status === "registered").length})</option>
          </select>
        </div>
        <span className="text-sm text-gray-400 ml-auto">
          📧 {recipients.length} recipients
        </span>
      </div>

      {/* Subject */}
      <input
        value={commSubject}
        onChange={(e) => setCommSubject(e.target.value)}
        placeholder="Email subject…"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Body */}
      <textarea
        value={commBody}
        onChange={(e) => setCommBody(e.target.value)}
        rows={12}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
      />

      <button
        onClick={handleSend}
        disabled={sending || !commSubject.trim() || !commBody.trim()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
      >
        📤 Send to {recipients.length}
      </button>
    </div>
  );
}
