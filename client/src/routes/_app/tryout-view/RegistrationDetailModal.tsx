import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { tryoutsApi, type RegistrationDetail } from "@/lib/api/tryouts.api";
import { Loader2 } from "lucide-react";

interface Props {
  tryoutId: string;
  registrationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistrationDetailModal({ tryoutId, registrationId, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useQuery<RegistrationDetail>({
    queryKey: ["tryout", tryoutId, "registration", registrationId],
    queryFn: () => tryoutsApi.getRegistrationDetail(tryoutId, registrationId!),
    enabled: open && !!registrationId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Registration Details</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive py-4">Failed to load registration details.</p>
        )}

        {data && <DetailContent detail={data} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailContent({ detail }: { detail: RegistrationDetail }) {
  const s = detail.swimmerDetails;
  const parent = detail.parentId;
  const swimmer = detail.swimmerId;

  return (
    <div className="space-y-6 py-2">
      {/* Swimmer */}
      <Section title="Swimmer">
        <Row
          label="Name"
          value={`${swimmer?.firstName ?? s.firstName} ${swimmer?.lastName ?? s.lastName}`}
        />
        {s.dob && <Row label="Date of birth" value={s.dob} />}
        <Row label="Age on tryout day" value={String(s.ageOnTryoutDay)} />
        <Row label="Segment" value={detail.segmentId || "—"} />
      </Section>

      {/* USA Swimming */}
      <Section title="USA Swimming">
        <Row label="Has membership" value={s.hasUsaMembership ? "Yes" : "No"} />
        {s.hasUsaMembership && (
          <>
            <Row label="Membership ID" value={s.usaMembershipId || "—"} />
            <Row label="Club name" value={s.clubName || "—"} />
          </>
        )}
      </Section>

      {/* Guardian */}
      <Section title="Guardian / Parent">
        <Row label="Guardian name" value={s.guardianName} />
        <Row label="Guardian email" value={s.guardianEmail} />
        <Row
          label="Parent"
          value={parent ? `${parent.firstName} ${parent.lastName} (${parent.email})` : "—"}
        />
      </Section>

      {/* Dynamic answers */}
      {detail.dynamicAnswers && detail.dynamicAnswers.length > 0 && (
        <Section title="Registration Answers">
          {detail.dynamicAnswers.map((a, i) => (
            <Row
              key={i}
              label={a.label}
              value={Array.isArray(a.value) ? a.value.join(", ") : String(a.value)}
            />
          ))}
        </Section>
      )}

      {/* Scores */}
      {/* {detail.scores && (
        <Section title="Scores">
          {detail.scores.safetyEntryExit !== undefined && (
            <Row label="Safety entry/exit" value={detail.scores.safetyEntryExit ? "Pass" : "Fail"} />
          )}
          {detail.scores.safetyFloat !== undefined && (
            <Row label="Safety float" value={detail.scores.safetyFloat ? "Pass" : "Fail"} />
          )}
          {detail.scores.freestyle !== undefined && (
            <Row label="Freestyle" value={String(detail.scores.freestyle)} />
          )}
          {detail.scores.backstroke !== undefined && (
            <Row label="Backstroke" value={String(detail.scores.backstroke)} />
          )}
          {detail.scores.breaststroke !== undefined && (
            <Row label="Breaststroke" value={String(detail.scores.breaststroke)} />
          )}
          {detail.scores.butterfly !== undefined && (
            <Row label="Butterfly" value={String(detail.scores.butterfly)} />
          )}
          {detail.scores.totalScore !== undefined && (
            <Row label="Total score" value={String(detail.scores.totalScore)} highlight />
          )}
        </Section>
      )} */}

      {/* Status */}
      {/* <Section title="Status">
        <Row label="Registration status" value={detail.status} />
        <Row label="USA verification" value={detail.usaVerificationStatus || "pending"} />
        {detail.waitlistPosition !== undefined && (
          <Row label="Waitlist position" value={String(detail.waitlistPosition)} />
        )}
        {detail.registeredAt && (
          <Row
            label="Registered at"
            value={new Date(detail.registeredAt).toLocaleString()}
          />
        )}
      </Section> */}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${highlight ? "font-bold text-foreground" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
