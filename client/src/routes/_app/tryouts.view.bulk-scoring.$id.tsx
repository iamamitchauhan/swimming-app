import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useSidebar } from "@/components/ui/sidebar";
import { useTryout } from "@/hooks/use-tryouts";
import { useTryoutRegistration } from "@/hooks/use-tryout-dashboard";
import { BulkScoreTab } from "./tryout-view/BulkScoreTab";

export default function BulkScoringPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { open, setOpen } = useSidebar();
  const wasOpen = useRef(open);

  useEffect(() => {
    wasOpen.current = open;
    setOpen(false);
    return () => {
      setOpen(wasOpen.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      <PageShell
        title="Loading…"
        crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "Bulk scoring" }]}
      >
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (tryoutError || !tryout || ids.length === 0 || registrations.length === 0) {
    return (
      <PageShell title="Scoring" crumbs={[{ label: "Tryouts", href: "/tryouts" }]}>
        <div className="py-24 text-center text-muted-foreground">
          No selected swimmers were found.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Scoring`}
      crumbs={[
        { label: "Tryouts", href: "/tryouts" },
        { label: tryout.name, href: `/tryouts/view/${id}` },
        { label: `Scoring` },
      ]}
    >
      <BulkScoreTab
        tryoutId={id}
        registrations={registrations}
        onBack={() => navigate(`/tryouts/view/${id}`)}
      />
    </PageShell>
  );
}
