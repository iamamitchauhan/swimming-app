/**
 * Converts an unknown mutation/query error to a human-readable message.
 * Uses sonner's toast for display.
 *
 * Usage:
 *   const { toastError } = useApiError();
 *   mutation.mutate(input, { onError: toastError });
 */
import { toast } from "sonner";
import { ApiError } from "../lib/api/client";

export function useApiError() {
  const toastError = (error: unknown) => {
    if (error instanceof ApiError) {
      toast.error(error.message);
    } else if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return "Something went wrong.";
  };

  return { toastError, getErrorMessage };
}
