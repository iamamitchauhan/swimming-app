import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Segment } from "@/lib/api/tryouts.api";

const BADGE_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
];

interface Props {
  segments: Segment[];
  maxVisible?: number;
}

export function SegmentBadges({ segments, maxVisible = 2 }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (segments.length === 0) {
    return <span className="text-sm">—</span>;
  }

  const visible = expanded ? segments : segments.slice(0, maxVisible);
  const hiddenCount = segments.length - maxVisible;

  return (
    <div className={`flex gap-1 flex-col w-fit ${expanded ? "flex-col" : "flex-row"}`}>
      {visible.map((seg, i) => (
        <Badge
          key={i}
          variant="outline"
          className={`text-[10px] font-medium whitespace-nowrap ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
        >
          {seg.minAge}–{seg.maxAge} {seg.level}
        </Badge>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer text-left"
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer text-left"
        >
          show less
        </button>
      )}
    </div>
  );
}
