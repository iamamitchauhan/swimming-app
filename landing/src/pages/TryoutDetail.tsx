import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, Info as InfoIcon, MapPin, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TryoutStatusBadge } from "@/components/tryouts/StatusBadge";
import { RegistrationModal } from "@/components/registrations/RegistrationModal";
import { parentQuery, tryoutQuery } from "@/lib/queries";
import { tryoutStatus } from "@/lib/api/tryouts";
import { formatDate } from "@/lib/format";
import type { Slot } from "@/lib/types";
import { toast } from "sonner";

const HIGHLIGHTS = ["No experience needed", "All skill levels welcome", "Coach feedback included", "Small group attention"];
const HOW_IT_WORKS = [
  { title: "Pick a Slot", body: "Choose a session time that works for your family." },
  { title: "Swim and Be Evaluated", body: "Our coaches will assess technique, endurance, and water comfort." },
  { title: "Hear Back by Email", body: "We'll send personalized results within 3–5 business days." },
];
const FAQS = [
  { q: "How long is each tryout slot?", a: "Each session runs about 45 minutes including warm-up and evaluation." },
  { q: "Does my child need prior experience?", a: "No — tryouts are open to all skill levels. Coaches will tailor the evaluation to your child." },
  { q: "When will we hear back?", a: "You'll receive a personalized email with results within 3–5 business days." },
  { q: "Can parents watch?", a: "Yes, parents are welcome to observe from the designated viewing area." },
];

export default function TryoutDetailPage() {
  const { id = "" } = useParams();
  const { data: tryout, isLoading } = useQuery(tryoutQuery(id));
  const { data: parent } = useQuery(parentQuery());
  const navigate = useNavigate();
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);

  if (!isLoading && !tryout) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Tryout not found</h1>
        <Button asChild className="mt-4"><Link to="/tryouts">Back to tryouts</Link></Button>
      </div>
    );
  }
  if (!tryout) return null;
  const status = tryoutStatus(tryout);

  const handleSelectSlot = (slot: Slot) => {
    if (!parent) { toast.info("Please log in to register your child."); navigate("/login"); return; }
    if (slot.capacity - slot.taken <= 0) { toast.error("This slot is full."); return; }
    setActiveSlot(slot);
  };
  const openSlot = tryout.slots.find((s) => s.capacity - s.taken > 0) ?? tryout.slots[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <section className="relative h-64 w-full overflow-hidden rounded-2xl sm:h-80">
        <img src={tryout.image} alt={tryout.name} width={1600} height={700} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <TryoutStatusBadge status={status} />
            <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground backdrop-blur">{tryout.skillLevel.split(" ")[0]}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">{tryout.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="h-4 w-4" />{tryout.location}, {tryout.city}
          </p>
          <Button className="btn-cta mt-4" onClick={() => handleSelectSlot(openSlot)}>Sign up today</Button>
        </div>
      </section>

      <Section title="About This Tryout">
        <p className="text-muted-foreground">{tryout.description}</p>
        <p className="mt-3 text-muted-foreground">Whether your child is just starting out or aiming for the competitive squad, we'll provide personalized feedback and guidance.</p>
      </Section>

      <Section title="Highlights">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <Card key={h} className="flex items-center gap-2 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-status-approved" /><span className="text-sm font-medium">{h}</span></Card>
          ))}
        </div>
      </Section>

      <Section title="Who Can Participate?">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[{ label: "U10 Beginner", age: "6–10", level: "Beginner" }, { label: "U12 Intermediate", age: "10–12", level: "Intermediate" }, { label: "U15 Competitive", age: "12–15", level: "Competitive" }].map((g) => (
            <Card key={g.label} className="p-5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary"><Users className="h-4 w-4" /></div>
              <h3 className="mt-3 font-display font-bold">{g.label}</h3>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Age</span><span className="font-semibold">{g.age}</span></div>
              <div className="mt-1 flex items-center justify-between text-sm"><span className="text-ocean">Level</span><span className="font-semibold">{g.level}</span></div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Available Sessions">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tryout.slots.map((s) => {
            const full = s.capacity - s.taken <= 0;
            return (
              <Card key={s.id} className="p-4">
                <h3 className="font-bold">{s.label}</h3>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{formatDate(tryout.date)}</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{s.time}</div>
                <Button variant="outline" className="mt-4 w-full" disabled={full} onClick={() => handleSelectSlot(s)}>{full ? "Full" : "Select"}</Button>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Tryout Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary"><Timer className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">Slot Duration</div><div className="font-bold">45 minutes</div></div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary"><Users className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">Swimmers Per Slot</div><div className="font-bold">{openSlot.capacity} swimmers</div></div>
          </Card>
        </div>
      </Section>

      <Section title="How It Works">
        <ol className="space-y-4">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
              <div><h3 className="font-bold">{step.title}</h3><p className="text-sm text-muted-foreground">{step.body}</p></div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Important Instructions">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium text-foreground">Please arrive 15 minutes before your scheduled slot.</p>
            <div className="mt-3 text-sm">
              <div className="font-medium text-foreground">What to bring:</div>
              <ul className="mt-1 list-inside list-disc"><li>Swimsuit and goggles</li><li>Towel and cap</li><li>Water bottle</li></ul>
            </div>
            <p className="mt-3 text-sm">Parents may observe from the upper deck.</p>
          </AlertDescription>
        </Alert>
      </Section>

      <Section title="Frequently Asked Questions">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      <section className="mt-10 rounded-2xl bg-muted/50 p-8 text-center">
        <h2 className="font-display text-2xl font-bold">Ready to Join?</h2>
        <p className="mt-2 text-muted-foreground">Secure your child's spot — slots are limited and fill up fast.</p>
        <Button size="lg" className="btn-cta mt-5" onClick={() => handleSelectSlot(openSlot)}>Sign up today</Button>
      </section>

      {activeSlot && (
        <RegistrationModal tryout={tryout} slot={activeSlot} open={!!activeSlot} onOpenChange={(o) => !o && setActiveSlot(null)} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="font-display text-2xl font-bold">{title}</h2><div className="mt-4">{children}</div></section>;
}
