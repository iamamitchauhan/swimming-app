import { useState } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import type { Registration, Tryout } from "@/lib/api/tryouts.api";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
  waitlisted: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const VERIFY_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  needs_review: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
};

const VERIFY_LABELS: Record<string, string> = {
  pending: "Pending",
  needs_review: "Needs review",
  verified: "Verified",
  rejected: "Rejected",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t?: string) {
  if (!t) return "";
  // Already 12h format — return as-is
  if (/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/.test(t)) return t;
  // 24h format — convert to 12h
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function avg(r: Registration) {
  const scores = [r.freestyle, r.backstroke, r.breaststroke, r.butterfly]
    .map(Number)
    .filter((v) => !isNaN(v) && v > 0);
  if (!scores.length) return null;
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryout: Tryout;
  registered: Registration[];
  onDecision: (id: string, status: "offered" | "rejected") => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RosterTab({ tryout, registered, onDecision }: Props) {
  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);

  const filteredRoster = registered.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.swimmer_name.toLowerCase().includes(q) ||
      (r.guardian_email || r.parent_email || "").toLowerCase().includes(q);
    const matchSeg = !segFilter || r.segment_id === segFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchSeg && matchStatus;
  });
  console.info("tryout.segments =>", tryout.segments);
  console.info("segFilter =>", segFilter);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-50">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search swimmer or parent email…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex-1 min-w-48"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer">
              {tryout.segments?.find((seg) => (seg as any).id === segFilter)?.name ||
                (segFilter === "" ? "All segments" : segFilter)}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSegFilter("")}>All segments</DropdownMenuItem>
            {tryout.segments?.map((seg, i) => (
              <DropdownMenuItem
                key={i}
                onClick={() => setSegFilter((seg as any).name || String(i))}
              >
                {seg.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer capitalize">
              {statusFilter === "" ? "All status" : statusFilter}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setStatusFilter("")}>All status</DropdownMenuItem>
            {["registered", "offered", "rejected"].map((s) => (
              <DropdownMenuItem className="capitalize" key={s} onClick={() => setStatusFilter(s)}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-white text-xs uppercase tracking-wide">
            <tr>
              {[
                "Swimmer",
                "Age",
                "Segment",
                "When",
                "USA-S ID",
                "Parent",
                "Status",
                "Avg Score",
                "Action",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRoster.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No registrations yet
                </td>
              </tr>
            )}
            {filteredRoster.map((r) => {
              const verSt = r.usa_verification_status || "pending";
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td
                    className="px-4 py-3 font-medium text-blue-700 cursor-pointer hover:underline"
                    onClick={() => {
                      setSelectedRegId(r.id);
                      setModalOpen(true);
                    }}
                  >
                    {r.swimmer_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.swimmer_age}</td>
                  <td className="px-4 py-3 text-gray-600">{r.segment_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {r.session_date ? fmtDate(r.session_date) : "—"}
                    {r.slot_start && (
                      <span className="text-gray-400">
                        {" "}
                        · {fmtTime(r.slot_start)}–{fmtTime(r.slot_end)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.usa_membership_id ? (
                      <div>
                        <div className="font-mono text-xs text-gray-700">{r.usa_membership_id}</div>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${VERIFY_COLORS[verSt]}`}
                        >
                          {VERIFY_LABELS[verSt]}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{r.guardian_name || r.parent_name}</div>
                    <div className="text-xs text-gray-400">
                      {r.guardian_email || r.parent_email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{avg(r) || "—"}</td>
                  <td>
                    {(() => {
                      if (r.status !== "registered") {
                        return <div className="flex items-center gap-2 pl-4">-</div>;
                      }
                      const hasAvg = !!avg(r);
                      const offerBtn = (
                        <button
                          disabled={!hasAvg}
                          onClick={() => onDecision(r.id, "offered")}
                          className="text-xs text-green-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Offer
                        </button>
                      );
                      const rejectBtn = (
                        <button
                          disabled={!hasAvg}
                          onClick={() => onDecision(r.id, "rejected")}
                          className="text-xs text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      );
                      return (
                        <div className="flex items-center gap-2 pl-4">
                          {hasAvg ? (
                            offerBtn
                          ) : (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block">{offerBtn}</span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  Cannot offer without an average score.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {hasAvg ? (
                            rejectBtn
                          ) : (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block">{rejectBtn}</span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  Cannot reject without an average score.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RegistrationDetailModal
        tryoutId={tryout._id}
        registrationId={selectedRegId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
