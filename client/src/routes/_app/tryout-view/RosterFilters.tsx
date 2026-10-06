import { useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/search-input";
import { cn } from "@/lib/utils";
import type { RegistrationListParams, TryoutSlot } from "@/lib/api/tryouts.api";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Sentinel stored on `coachRecommendation` when a swimmer is rejected. */
export const REJECTED_VALUE = "__rejected__";

/** Client-only sentinel for the coach's "Recommend" bucket (any group). */
const RECOMMEND_VALUE = "__recommend__";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "registered", label: "Registered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

const CHECK_IN_OPTIONS: SingleOption[] = [
  { value: "all", label: "All check-ins" },
  { value: "in", label: "Check-in" },
  { value: "out", label: "Not check-in" },
];

const REGISTRATION_OPTIONS: SingleOption[] = [
  { value: "all", label: "All registered" },
  { value: "sent", label: "Email sent" },
  { value: "not", label: "Not sent" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
  /** Optional group header (e.g. a session date) rendered above the option. */
  group?: string;
}

export interface SingleOption {
  value: string;
  label: string;
}

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

const TRIGGER_CLS =
  "inline-flex h-9 items-center justify-between gap-2 whitespace-nowrap rounded-lg border bg-white px-3 text-sm text-gray-700 transition hover:bg-gray-50 cursor-pointer";

function activateOnKey(e: KeyboardEvent, action: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}

/**
 * "Select all" / "Clear" links. "Select all" checks every option; "Clear"
 * unchecks every option — and an empty selection means no filter (all shown).
 */
function SelectAllClear({
  allValues,
  onChange,
}: {
  allValues: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange(allValues)}
        className="cursor-pointer text-primary hover:underline"
      >
        Select all
      </button>
      <button
        type="button"
        onClick={() => onChange([])}
        className="cursor-pointer text-primary hover:underline"
      >
        Clear
      </button>
    </div>
  );
}

interface CheckboxListProps {
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Checkbox list. Boxes mirror the selection exactly; an empty selection is
 * treated as "no filter" (everything shown) by the parent.
 */
function CheckboxList({ options, selected, onChange }: CheckboxListProps) {
  const selectedSet = new Set(selected);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-0.5">
      {options.map((opt, i) => {
        const showGroup = !!opt.group && opt.group !== options[i - 1]?.group;
        return (
          <div key={opt.value}>
            {showGroup && (
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {opt.group}
              </p>
            )}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggle(opt.value)}
              onKeyDown={(e) => activateOnKey(e, () => toggle(opt.value))}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <Checkbox checked={selectedSet.has(opt.value)} className="pointer-events-none" />
              {opt.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Toolbar multi-select dropdown ────────────────────────────────────────────

interface MultiSelectDropdownProps {
  /** Shown on the trigger when nothing is selected (filter inactive). */
  defaultLabel: string;
  /** Heading inside the popover. */
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

export function MultiSelectDropdown({
  defaultLabel,
  title,
  options,
  selected,
  onChange,
  className,
}: MultiSelectDropdownProps) {
  const first = selected.length > 0 ? options.find((o) => o.value === selected[0]) : undefined;
  const triggerLabel =
    selected.length === 0
      ? defaultLabel
      : selected.length === 1
        ? (first?.label ?? defaultLabel)
        : `${first?.label ?? ""} +${selected.length - 1}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            TRIGGER_CLS,
            selected.length > 0 ? "border-primary text-primary" : "border-gray-200",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-2 pb-1 text-sm font-semibold text-gray-800">{title}</p>
          <div className="px-2 pb-1">
            <SelectAllClear allValues={options.map((o) => o.value)} onChange={onChange} />
          </div>
          <CheckboxList options={options} selected={selected} onChange={onChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Toolbar single-select dropdown ───────────────────────────────────────────

interface SingleSelectDropdownProps {
  options: SingleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SingleSelectDropdown({
  options,
  value,
  onChange,
  className,
}: SingleSelectDropdownProps) {
  const current = options.find((o) => o.value === value) ?? options[0];
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(TRIGGER_CLS, "border-gray-200", className)}>
          <span className="truncate">{current?.label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5">
        {options.map((opt) => (
          <div
            key={opt.value}
            role="button"
            tabIndex={0}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            onKeyDown={(e) =>
              activateOnKey(e, () => {
                onChange(opt.value);
                setOpen(false);
              })
            }
            className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50"
          >
            {opt.label}
            {opt.value === value && <Check className="h-4 w-4 text-primary" />}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Inline multi-select group (inside "More filters") ────────────────────────

function InlineMultiSelect({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <SelectAllClear allValues={options.map((o) => o.value)} onChange={onChange} />
      </div>
      <CheckboxList options={options} selected={selected} onChange={onChange} />
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

export interface RosterFilterBarProps {
  role: "admin" | "coach";
  segments: { id: string; name: string }[];
  slots: TryoutSlot[];
  groups: { _id: string; name: string }[];
  params: RegistrationListParams;
  onChange: (patch: Partial<RegistrationListParams>) => void;
  search: string;
  onSearch: (value: string) => void;
  total: number;
  fmtDate: (date?: string) => string;
  fmtTime: (time?: string) => string;
}

export function RosterFilterBar({
  role,
  segments,
  slots,
  groups,
  params,
  onChange,
  search,
  onSearch,
  total,
  fmtDate,
  fmtTime,
}: RosterFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const segmentOptions: FilterOption[] = segments.map((s) => ({ value: s.id, label: s.name }));
  const slotOptions: FilterOption[] = slots.map((s) => ({
    value: s._id,
    label: `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}`,
    group: fmtDate(s.sessionDate),
  }));
  const groupIds = groups.map((g) => g._id);
  const adminRecOptions: FilterOption[] = [
    ...groups.map((g) => ({ value: g._id, label: g.name })),
    { value: REJECTED_VALUE, label: "Rejected" },
  ];
  const coachRecOptions: FilterOption[] = [
    { value: RECOMMEND_VALUE, label: "Recommend" },
    { value: REJECTED_VALUE, label: "Reject" },
  ];

  const selectedSegmentIds = params.segmentIds ?? [];
  const selectedSlotIds = params.slotIds ?? [];
  const selectedStatuses = params.statuses ?? [];
  const selectedRecs = params.coachRecommendations ?? [];

  // Coach recommendation is a 2-bucket view over `coachRecommendations`:
  // "Recommend" = any group, "Reject" = the rejected sentinel.
  const coachRecommendChecked = selectedRecs.some((v) => groupIds.includes(v));
  const coachRejectChecked = selectedRecs.includes(REJECTED_VALUE);
  const coachRecSelected = [
    ...(coachRecommendChecked ? [RECOMMEND_VALUE] : []),
    ...(coachRejectChecked ? [REJECTED_VALUE] : []),
  ];

  function onCoachRecChange(next: string[]) {
    const recommend = next.includes(RECOMMEND_VALUE);
    const reject = next.includes(REJECTED_VALUE);
    // No boxes checked → no filter (all shown).
    if (!recommend && !reject) {
      onChange({ coachRecommendations: undefined, page: 1 });
      return;
    }
    const recs = [...(recommend ? groupIds : []), ...(reject ? [REJECTED_VALUE] : [])];
    onChange({ coachRecommendations: recs.length ? recs : undefined, page: 1 });
  }

  const checkInValue = params.checkedIn === undefined ? "all" : params.checkedIn ? "in" : "out";
  const registrationValue =
    params.emailSent === undefined ? "all" : params.emailSent ? "sent" : "not";

  const labelFor = (options: FilterOption[], id: string) =>
    options.find((o) => o.value === id)?.label ?? id;

  // ── Chips ──────────────────────────────────────────────────────────────────
  const chips: FilterChip[] = [];
  if (selectedSegmentIds.length > 0) {
    chips.push({
      key: "segment",
      label: `Segment: ${selectedSegmentIds.map((id) => labelFor(segmentOptions, id)).join(", ")}`,
      onRemove: () => onChange({ segmentIds: undefined, page: 1 }),
    });
  }
  if (selectedSlotIds.length > 0) {
    chips.push({
      key: "slot",
      label: `Time slot: ${selectedSlotIds.map((id) => labelFor(slotOptions, id)).join(", ")}`,
      onRemove: () => onChange({ slotIds: undefined, page: 1 }),
    });
  }
  // Coaches always run with the default check-in filter applied and can't
  // change it, so it's never surfaced as a removable chip for them.
  if (role !== "coach" && params.checkedIn !== undefined) {
    chips.push({
      key: "checkIn",
      label: `Check-in: ${params.checkedIn ? "Check-in" : "Not check-in"}`,
      onRemove: () => onChange({ checkedIn: undefined, page: 1 }),
    });
  }
  if (selectedStatuses.length > 0) {
    chips.push({
      key: "status",
      label: `Status: ${selectedStatuses.map((s) => labelFor(STATUS_OPTIONS, s)).join(", ")}`,
      onRemove: () => onChange({ statuses: undefined, page: 1 }),
    });
  }
  if (selectedRecs.length > 0) {
    const recLabel =
      role === "coach"
        ? [coachRecommendChecked ? "Recommend" : null, coachRejectChecked ? "Reject" : null]
            .filter(Boolean)
            .join(", ")
        : selectedRecs.map((id) => labelFor(adminRecOptions, id)).join(", ");
    chips.push({
      key: "recommendation",
      label: `Recommendation: ${recLabel}`,
      onRemove: () => onChange({ coachRecommendations: undefined, page: 1 }),
    });
  }
  if (params.emailSent !== undefined) {
    chips.push({
      key: "registration",
      label: `Registration: ${params.emailSent ? "Email sent" : "Not sent"}`,
      onRemove: () => onChange({ emailSent: undefined, page: 1 }),
    });
  }

  // Popover badge counts only the filters that live inside "More filters".
  const popoverFilterCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedRecs.length > 0 ? 1 : 0) +
    (params.emailSent !== undefined ? 1 : 0);

  function clearAll() {
    onChange({
      segmentIds: undefined,
      slotIds: undefined,
      // Coaches keep their default check-in filter; everyone else clears it.
      ...(role === "coach" ? {} : { checkedIn: undefined }),
      statuses: undefined,
      coachRecommendations: undefined,
      emailSent: undefined,
      page: 1,
    });
  }

  const segmentFilter = (
    <MultiSelectDropdown
      defaultLabel="All segments"
      title="Segment"
      options={segmentOptions}
      selected={selectedSegmentIds}
      onChange={(next) => onChange({ segmentIds: next.length ? next : undefined, page: 1 })}
    />
  );
  const slotFilter = (
    <MultiSelectDropdown
      defaultLabel="All time slots"
      title="Time slot"
      options={slotOptions}
      selected={selectedSlotIds}
      onChange={(next) => onChange({ slotIds: next.length ? next : undefined, page: 1 })}
    />
  );

  return (
    <div className="border-b border-gray-50 px-0.5 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Search swimmer or parent"
          className="min-w-48 flex-1 bg-white"
          debounceMs={350}
        />

        {role === "coach" ? (
          <>
            {slotFilter}
            {segmentFilter}
            <MultiSelectDropdown
              defaultLabel="All recommendations"
              title="Recommendation"
              options={coachRecOptions}
              selected={coachRecSelected}
              onChange={onCoachRecChange}
            />
          </>
        ) : (
          <>
            {segmentFilter}
            {slotFilter}
            <SingleSelectDropdown
              options={CHECK_IN_OPTIONS}
              value={checkInValue}
              onChange={(v) =>
                onChange({
                  checkedIn: v === "all" ? undefined : v === "in",
                  page: 1,
                })
              }
            />
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "shrink-0 gap-2 bg-white",
                    popoverFilterCount > 0 && "border-primary text-primary",
                  )}
                >
                  <Filter className="h-4 w-4" />
                  More filters
                  {popoverFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {popoverFilterCount}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="grid gap-4 p-4">
                  <InlineMultiSelect
                    title="Status"
                    options={STATUS_OPTIONS}
                    selected={selectedStatuses}
                    onChange={(next) =>
                      onChange({ statuses: next.length ? next : undefined, page: 1 })
                    }
                  />
                  <InlineMultiSelect
                    title="Recommendation"
                    options={adminRecOptions}
                    selected={selectedRecs}
                    onChange={(next) =>
                      onChange({ coachRecommendations: next.length ? next : undefined, page: 1 })
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">Registration</p>
                    <select
                      value={registrationValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange({ emailSent: v === "all" ? undefined : v === "sent", page: 1 });
                      }}
                      className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {REGISTRATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                  <Button onClick={() => setFiltersOpen(false)}>Done</Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* <span className="ml-auto whitespace-nowrap text-sm text-gray-400">
          {total} swimmer{total === 1 ? "" : "s"}
        </span> */}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-3">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-primary"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="cursor-pointer text-gray-400 hover:text-gray-700"
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer text-sm text-muted-foreground underline hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
