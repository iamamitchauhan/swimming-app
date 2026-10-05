import { Badge } from "@/components/ui/badge";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";

/** Read-only type indicator: YESNO/RATING show both pills, the active one filled. */
export function QuestionTypeIndicator({ type }: { type: ScoringQuestion["type"] }) {
  if (type === "TEXT") {
    return (
      <Badge variant="outline" className="whitespace-nowrap text-[10px] font-normal">
        Text
      </Badge>
    );
  }
  const isYesNo = type === "YESNO";
  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      <Badge
        variant={isYesNo ? "default" : "outline"}
        className="whitespace-nowrap text-[10px] font-normal"
      >
        Y/N
      </Badge>
      <Badge
        variant={isYesNo ? "outline" : "default"}
        className="whitespace-nowrap text-[10px] font-normal"
      >
        1-5
      </Badge>
    </div>
  );
}
