import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Calendar, Users, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TryoutCard } from "@/components/tryouts/TryoutCard";
import { statsQuery, tryoutsQuery } from "@/lib/queries";
import heroImg from "@/assets/hero-pool.jpg";

export default function LandingPage() {
  const { data: stats } = useQuery(statsQuery());
  const { data: tryouts = [] } = useQuery(tryoutsQuery({ sort: "latest" }));
  const featured = tryouts.slice(0, 6);

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Competitive swimmer in pool" width={1920} height={1080} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center text-white">
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Discover Swimming Tryouts For Your Child
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Browse available tryouts, reserve slots, and track registrations all in one place — designed for busy swim parents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-cta">
                <Link to="/tryouts">View Tryouts <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-lift sm:grid-cols-4 sm:gap-6 sm:p-6">
          <Stat icon={<Calendar />} label="Open Tryouts" value={stats?.openTryouts} />
          <Stat icon={<Waves />} label="Available Slots" value={stats?.availableSlots} />
          <Stat icon={<Users />} label="Registered Families" value={stats?.registeredFamilies} />
          <Stat icon={<Building2 />} label="Participating Clubs" value={stats?.participatingClubs} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-ocean">Now open</p>
            <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Tryouts taking registrations</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/tryouts">See all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => <TryoutCard key={t.id} tryout={t} />)}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | undefined }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold">{value ?? "—"}</div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
