import { PageShell, StatCard } from "@/components/page-shell";
import { useAuthStore } from "@/lib/auth.store";
import {
  Users,
  Building2,
  Waves,
  Clock,
  UserCog,
  GraduationCap,
  Trophy,
  CalendarRange,
  Baby,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClubCoaches } from "@/hooks/use-clubs";

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <PageShell title="Dashboard">
      {role === "super_admin" && <SuperAdminDash />}
      {role === "admin" && <AdminDash />}
      {role === "coach" && <CoachDash />}
      {(!role || !(["super_admin", "admin", "coach"] as string[]).includes(role)) && <ParentDash />}
    </PageShell>
  );
}

function MiniChart() {
  const bars = [40, 65, 50, 75, 60, 90, 70, 95, 80, 100, 85, 110];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary"
          style={{ height: `${(b / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SuperAdminDash() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value="2,847" hint="+12% this month" icon={Users} />
        <StatCard label="Total Clubs" value="184" hint="+8 new" icon={Building2} accent="aqua" />
        <StatCard
          label="Active Tryouts"
          value="42"
          hint="Across 31 clubs"
          icon={Waves}
          accent="success"
        />
        <StatCard
          label="Pending Approvals"
          value="9"
          hint="Awaiting review"
          icon={Clock}
          accent="warning"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="User Growth"
          action={
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              +24%
            </Badge>
          }
        >
          <MiniChart />
        </Card>
        <Card title="Club Registrations">
          <MiniChart />
        </Card>
        <Card title="Tryout Statistics">
          <MiniChart />
        </Card>
      </div>
      <Card
        title="Recent Activity"
        action={
          <Button variant="ghost" size="sm">
            View all
          </Button>
        }
      >
        <ActivityFeed />
      </Card>
    </div>
  );
}

function AdminDash() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Coaches" value="14" hint="2 invitations pending" icon={UserCog} />
        <StatCard label="Active Tryouts" value="6" hint="3 this week" icon={Waves} accent="aqua" />
        <StatCard
          label="Registered Swimmers"
          value="312"
          hint="+18 this month"
          icon={GraduationCap}
          accent="success"
        />
        <StatCard
          label="Pending Registrations"
          value="11"
          hint="Awaiting confirmation"
          icon={Clock}
          accent="warning"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Club Summary">
          <dl className="space-y-3 text-sm">
            {[
              ["Club name", "Pacific Wave Aquatics"],
              ["Founded", "2018"],
              ["Members", "312 swimmers"],
              ["Plan", "Pro"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Recent Coaches">
          <CoachList />
        </Card>
        <Card title="Upcoming Tryouts">
          <TryoutList />
        </Card>
      </div>
    </div>
  );
}

function CoachDash() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned Tryouts" value="4" icon={Waves} />
        <StatCard label="Created Tryouts" value="2" icon={Trophy} accent="aqua" />
        <StatCard
          label="Upcoming Events"
          value="3"
          hint="Next: Saturday"
          icon={CalendarRange}
          accent="success"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upcoming Tryouts">
          <TryoutList />
        </Card>
        <Card title="Recent Evaluations">
          <EvalList />
        </Card>
      </div>
    </div>
  );
}

function ParentDash() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Children Registered" value="2" icon={Baby} />
        <StatCard
          label="Upcoming Tryouts"
          value="3"
          hint="Next: Mar 15"
          icon={CalendarRange}
          accent="aqua"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Child Progress">
          <div className="space-y-4">
            {[
              { n: "Mia Davies", l: "Level 4 — Advanced", p: 78 },
              { n: "Owen Davies", l: "Level 2 — Intermediate", p: 54 },
            ].map((c) => (
              <div key={c.n}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{c.n}</span>
                  <span className="text-muted-foreground">{c.l}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-aqua rounded-full"
                    style={{ width: `${c.p}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Upcoming Registrations">
          <TryoutList />
        </Card>
      </div>
    </div>
  );
}

function ActivityFeed() {
  const items = [
    { who: "Pacific Wave", what: "registered a new club", when: "2m ago", icon: Building2 },
    { who: "Coach Reyes", what: "created Spring Tryouts 2026", when: "1h ago", icon: Waves },
    { who: "M. Chen", what: "approved 14 swimmers", when: "3h ago", icon: GraduationCap },
    { who: "AquaKids Club", what: "submitted setup for review", when: "Yesterday", icon: Clock },
  ];
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <it.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 text-sm">
            <span className="font-medium">{it.who}</span>{" "}
            <span className="text-muted-foreground">{it.what}</span>
          </div>
          <span className="text-xs text-muted-foreground">{it.when}</span>
        </li>
      ))}
    </ul>
  );
}

function CoachList() {
  const coaches = [
    { name: "Elena Reyes", tag: "Head Coach" },
    { name: "Marcus Tan", tag: "Sprint" },
    { name: "Priya Shah", tag: "Distance" },
  ];

  const { data, isLoading, isError, error, isFetching } = useClubCoaches();
  console.info("data =>", data);

  return (
    <ul className="space-y-3">
      {coaches.map((c) => (
        <li key={c.name} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {c.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.tag}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TryoutList() {
  const t = [
    { name: "Spring Tryouts 2026", date: "Mar 15", reg: 42 },
    { name: "Junior Squad Eval", date: "Mar 22", reg: 18 },
    { name: "Open Water Trial", date: "Apr 02", reg: 8 },
  ];
  return (
    <ul className="space-y-3">
      {t.map((x) => (
        <li key={x.name} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-aqua/15 text-aqua-foreground flex flex-col items-center justify-center">
            <Waves className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{x.name}</div>
            <div className="text-xs text-muted-foreground">
              {x.date} · {x.reg} registered
            </div>
          </div>
          <Badge variant="secondary">Open</Badge>
        </li>
      ))}
    </ul>
  );
}

function EvalList() {
  const e = [
    { swimmer: "Liam O.", score: "A-", t: "Freestyle 50m" },
    { swimmer: "Zoe K.", score: "B+", t: "Backstroke 100m" },
    { swimmer: "Noah P.", score: "A", t: "Butterfly 50m" },
  ];
  return (
    <ul className="space-y-3">
      {e.map((x) => (
        <li key={x.swimmer} className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{x.swimmer}</span> ·{" "}
            <span className="text-muted-foreground">{x.t}</span>
          </div>
          <Badge>{x.score}</Badge>
        </li>
      ))}
    </ul>
  );
}
