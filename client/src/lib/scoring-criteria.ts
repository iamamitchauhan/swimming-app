export type CriterionType = "yesno" | "rate15" | "checkbox";

export interface Criterion {
  id: string;
  category: string;
  label: string;
  type: CriterionType;
}

export const SCORING_CRITERIA: Criterion[] = [
  // General deck & fundamentals
  {
    id: "circle_swim",
    category: "General deck & fundamentals",
    label: "Circle swim",
    type: "yesno",
  },
  {
    id: "ready_position",
    category: "General deck & fundamentals",
    label: "Ready position on wall",
    type: "yesno",
  },
  {
    id: "didnt_finish",
    category: "General deck & fundamentals",
    label: "Didn't finish",
    type: "yesno",
  },

  // Freestyle
  { id: "hand_entry", category: "Freestyle", label: "Hand entry", type: "yesno" },
  { id: "sl_dk_to_flags", category: "Freestyle", label: "SL DK to flags", type: "yesno" },
  {
    id: "legal_flip_turn",
    category: "Freestyle",
    label: "Legal flip turn / push off underwater",
    type: "yesno",
  },
  { id: "head_position_fs", category: "Freestyle", label: "Head position", type: "yesno" },
  { id: "bilateral_breathing", category: "Freestyle", label: "Bilateral breathing", type: "yesno" },
  {
    id: "legs_straight",
    category: "Freestyle",
    label: "Legs straight (not kicking from knees)",
    type: "rate15",
  },
  {
    id: "legal_kick_fs",
    category: "Freestyle",
    label: "Legal kick / not kicking from knees",
    type: "rate15",
  },
  {
    id: "stroke_count_uw",
    category: "Freestyle",
    label: "Stroke count / underwater off the wall",
    type: "rate15",
  },

  // Backstroke
  {
    id: "start_finish_back",
    category: "Backstroke",
    label: "Start and finish on back",
    type: "yesno",
  },
  { id: "head_position_back", category: "Backstroke", label: "Head position", type: "yesno" },

  // Breaststroke
  { id: "breath_timing", category: "Breaststroke", label: "Breath timing", type: "yesno" },
  {
    id: "legal_kick_br",
    category: "Breaststroke",
    label: "Legal kick / hands not past hips",
    type: "yesno",
  },
  {
    id: "underwater_pullout",
    category: "Breaststroke",
    label: "Underwater pullout",
    type: "yesno",
  },
  {
    id: "two_hands_br",
    category: "Breaststroke",
    label: "Two hands at each wall and finish",
    type: "yesno",
  },
  { id: "glide", category: "Breaststroke", label: "Glide", type: "rate15" },

  // Butterfly
  {
    id: "arms_over_water",
    category: "Butterfly",
    label: "Arms over the water recovery",
    type: "rate15",
  },
  {
    id: "legal_kick_fly",
    category: "Butterfly",
    label: "Legal kick (feet together)",
    type: "rate15",
  },
  {
    id: "two_hands_fly",
    category: "Butterfly",
    label: "Two hands at each wall and finish",
    type: "yesno",
  },
  {
    id: "timing_stroke",
    category: "Butterfly",
    label: "Timing of the stroke (breathing at the correct time)",
    type: "rate15",
  },

  // Starts & Underwaters
  {
    id: "uw_to_flags",
    category: "Starts & Underwaters",
    label: "UW to flags in streamline",
    type: "yesno",
  },
  {
    id: "headfirst_dive",
    category: "Starts & Underwaters",
    label: "Headfirst dive from the block",
    type: "yesno",
  },
];

export const CATEGORY_ORDER = [
  "General deck & fundamentals",
  "Freestyle",
  "Backstroke",
  "Breaststroke",
  "Butterfly",
  "Starts & Underwaters",
];

export const CRITERIA_BY_CATEGORY: Record<string, Criterion[]> = CATEGORY_ORDER.reduce(
  (acc, cat) => {
    acc[cat] = SCORING_CRITERIA.filter((c) => c.category === cat);
    return acc;
  },
  {} as Record<string, Criterion[]>,
);

export const TOTAL_CRITERIA = SCORING_CRITERIA.length;
