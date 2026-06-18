import { useQuery } from "@tanstack/react-query";
import { questionLibraryApi, QuestionCategory } from "@/lib/api/question-library.api";

export const questionLibraryKeys = {
  all: ["question-library"] as const,
  list: () => [...questionLibraryKeys.all, "list"] as const,
  detail: (id: string) => [...questionLibraryKeys.all, "detail", id] as const,
};

export function useQuestionLibrary() {
  return useQuery<QuestionCategory[]>({
    queryKey: questionLibraryKeys.list(),
    queryFn: () => questionLibraryApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}
