import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTryout } from "@/hooks/use-tryouts";
import { useTryoutRegistration } from "@/hooks/use-tryout-dashboard";
import { BulkScoreTab } from "./tryout-view/BulkScoreTab";

/** Full-screen scoring view — rendered outside AppLayout (no sidebar/app header). */
export default function BulkScoringPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = useMemo(
    () => Array.from(new Set((searchParams.get("ids") ?? "").split(",").filter(Boolean))),
    [searchParams],
  );
  const { data: tryout, isLoading: tryoutLoading, error: tryoutError } = useTryout(id);
  const {
    data: result,
    isLoading: registrationsLoading,
    isFetching,
  } = useTryoutRegistration(id, {
    page: 1,
    limit: Math.max(ids.length, 1),
    registerIds: ids,
  });

  const loading = tryoutLoading || registrationsLoading || isFetching;
  const registrations = result?.registrations ?? [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tryoutError || !tryout || ids.length === 0 || registrations.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted-foreground">No selected swimmers were found.</p>
        <button
          onClick={() => navigate(`/tryouts/view/${id}`)}
          className="cursor-pointer text-sm font-medium text-primary hover:underline"
        >
          Back to tryout
        </button>
      </div>
    );
  }

  return (
    <BulkScoreTab
      tryoutId={id}
      registrations={registrations}
      onBack={() => navigate(`/tryouts/view/${id}`)}
    />
  );
}
