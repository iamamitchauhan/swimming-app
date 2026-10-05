// The starter sheet offered by the Questions tab's empty state. Column names
// match the import parser (see scoring-question.parser.ts).

const HEADERS = ["category", "question", "type"];

const EXAMPLE_ROWS: string[][] = [
  ["General deck & fundamentals", "Circle swim", "yesno"],
  ["Freestyle", "Bilateral breathing", "yesno"],
  ["Freestyle", "Legs straight (not kicking from knees)", "rating"],
  ["Starts & Underwaters", "Headfirst dive from the block", "yesno"],
  ["General deck & fundamentals", "Coach comments", "text"],
];

/** A ready-to-fill CSV: header row plus example rows. */
export function buildTemplateCSV(): string {
  return [HEADERS, ...EXAMPLE_ROWS].map((row) => row.join(",")).join("\n");
}
