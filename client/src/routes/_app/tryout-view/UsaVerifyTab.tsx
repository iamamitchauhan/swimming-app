import { useState } from "react";
import type { Registration } from "@/lib/api/tryouts.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const VERIFY_COLORS: Record<string, string> = {
  pending:      "bg-gray-100 text-gray-500",
  needs_review: "bg-yellow-100 text-yellow-700",
  verified:     "bg-green-100 text-green-700",
  rejected:     "bg-red-100 text-red-500",
};

const VERIFY_LABELS: Record<string, string> = {
  pending:      "Pending",
  needs_review: "Needs review",
  verified:     "Verified",
  rejected:     "Rejected",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  roster: Registration[];
  onSetVerifyStatus: (id: string, status: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsaVerifyTab({ roster, onSetVerifyStatus }: Props) {
  const [verifyFilter, setVerifyFilter] = useState("all");

  const usaMembers = roster.filter((r) => r.usa_membership_id);

  const needsReviewCount = usaMembers.filter(
    (r) =>
      r.usa_verification_status === "needs_review" ||
      r.usa_verification_status === "pending" ||
      !r.usa_verification_status,
  ).length;

  const filterOptions = [
    { key: "all",         label: `All (${usaMembers.length})` },
    { key: "needs_review", label: `Needs review (${needsReviewCount})` },
    { key: "verified",    label: `Verified (${usaMembers.filter((r) => r.usa_verification_status === "verified").length})` },
    { key: "rejected",    label: `Rejected (${usaMembers.filter((r) => r.usa_verification_status === "rejected").length})` },
  ];

  const filtered = usaMembers.filter((r) => {
    const vs = r.usa_verification_status || "pending";
    if (verifyFilter === "all") return true;
    if (verifyFilter === "needs_review") return vs === "needs_review" || vs === "pending";
    return vs === verifyFilter;
  });

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          USA-S VERIFICATION · {usaMembers.length} swimmers with membership
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f.key}
              onClick={() => setVerifyFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                verifyFilter === f.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Cross-check IDs against the USA Swimming member directory, then mark each swimmer Verified, Needs review, or Rejected.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              {["Swimmer", "Age", "Segment", "Previous Club", "USA-S ID", "Status & Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No swimmers in this filter
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const vs = r.usa_verification_status || "pending";
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{r.swimmer_name}</div>
                    <div className="text-xs text-gray-400">{r.guardian_email || r.parent_email}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{r.swimmer_age}</td>
                  <td className="px-3 py-3 text-gray-600">{r.segment_name || "—"}</td>
                  <td className="px-3 py-3 text-gray-600">{r.club_name || "—"}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-sm">{r.usa_membership_id}</span>
                    {/* <a
                      href={`https://www.usaswimming.org/find-a-swimmer?name=${encodeURIComponent(r.swimmer_name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-xs text-blue-500 hover:underline"
                    >
                      lookup ↗
                    </a> */}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${VERIFY_COLORS[vs]}`}>
                        {VERIFY_LABELS[vs]}
                      </span>
                      <button
                        onClick={() => onSetVerifyStatus(r.id, "verified")}
                        className="text-xs text-green-600 hover:underline"
                      >
                        ✓ Verify
                      </button>
                      <button
                        onClick={() => onSetVerifyStatus(r.id, "needs_review")}
                        className="text-xs text-yellow-600 hover:underline"
                      >
                        ⚠ Review
                      </button>
                      <button
                        onClick={() => onSetVerifyStatus(r.id, "rejected")}
                        className="text-xs text-red-500 hover:underline"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
