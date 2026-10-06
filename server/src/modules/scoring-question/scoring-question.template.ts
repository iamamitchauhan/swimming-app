// The starter sheet offered by the Questions tab's empty state. Column names
// match the import parser (see scoring-question.parser.ts).

const HEADERS = ["category", "question", "type"];

const EXAMPLE_ROWS: string[][] = [
  ["General", "Finished the tryout?", "yesno"],
  ["General", "Freestyle proficient?", "yesno"],
  ["General", "Backstroke proficient?", "yesno"],
  ["General", "Butterfly proficient?", "yesno"],
  ["General", "Breaststroke proficient?", "yesno"],
  ["General", "Recommended by coach?", "yesno"],
];

/** A ready-to-fill CSV: header row plus example rows. */
export function buildTemplateCSV(): string {
  return [HEADERS, ...EXAMPLE_ROWS].map((row) => row.join(",")).join("\n");
}
