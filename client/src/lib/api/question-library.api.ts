import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "text" | "textarea" | "radio" | "checkbox";

export interface LibraryQuestion {
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface QuestionCategory {
  _id: string;
  category: string;
  questions: LibraryQuestion[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Selected question shape stored on a tryout ───────────────────────────────

export interface SelectedQuestion {
  categoryId: string;
  category: string;
  questionIndex: number;
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const questionLibraryApi = {
  /**
   * GET /question-library
   * Returns all categories with their questions (admin, coach)
   */
  list: (): Promise<QuestionCategory[]> =>
    api<QuestionCategory[]>(apiClient.get("/question-library")),

  /**
   * GET /question-library/:id
   */
  getById: (id: string): Promise<QuestionCategory> =>
    api<QuestionCategory>(apiClient.get(`/question-library/${id}`)),
};
