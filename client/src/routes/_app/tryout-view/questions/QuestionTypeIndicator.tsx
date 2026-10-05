import { Badge } from "@/components/ui/badge";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";

const TYPE_LABEL: Record<ScoringQuestion["type"], string> = {
  YESNO: "Y/N",
  RATING: "1-5",
  TEXT: "Text",
};

/** Read-only type indicator: a single pill showing the question's type. */
export function QuestionTypeIndicator({ type }: { type: ScoringQuestion["type"] }) {
  return (
    <Badge variant="outline" className="whitespace-nowrap text-[10px] font-normal">
      {TYPE_LABEL[type]}
    </Badge>
  );
}
