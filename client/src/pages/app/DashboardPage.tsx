import { PageShell, StatCard } from "@/components/page-shell";
import { useAuthStore } from "@/lib/auth.store";
import {
  Users,
  Building2,
  Waves,
  Clock,
  GraduationCap,
  Trophy,
  CalendarRange,
  Baby,
  TrendingUp,
  Activity,
  Circle,
  CircleAlert,
  LucideClockFading,
  Clock10,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTryouts } from "@/hooks/use-tryouts";
import { useClubState, useAdminState } from "@/hooks/use-clubs";
import { useUsersByClub } from "@/hooks/use-users";
import { useNavigate } from "react-router-dom";

function MiniChart() {
  const bars = [40, 65, 50, 75, 60, 90, 70, 95, 80, 100, 85, 110];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-linear-to-t from-primary/30 to-primary"
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

function RecentUsers() {
  const user = useAuthStore((s) => s.user);
  const clubId = user?.clubId ?? "";
  const { data, isLoading } = useUsersByClub(clubId);
  const navigate = useNavigate();

  const users = (data ?? []).filter((item: any) => item.type === "user").slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Clock10 className="animate-spin" />
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">No users in this club yet.</p>
        </div>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-medium text-primary"
          onClick={() => navigate("/users")}
        >
          View all users →
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {users.map((item: any) => {
        const u = item.data;
        return (
          <li key={u._id} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {u.firstName ? `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}` : "?"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {u.firstName} {u.lastName}
              </div>
              <div className="text-xs text-muted-foreground capitalize">{u.role}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TryoutList() {
  const { data, isLoading, isError, error, isFetching } = useTryouts({
    page: 1,
    limit: 5,
    search: "",
    status: "open",
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const navigate = useNavigate();

  const tryouts = data?.tryouts ?? [];

  if (isLoading) {
    <div className="flex items-center justify-center">
      <Clock10 className="animate-spin" />
    </div>;
  }

  if (!tryouts || tryouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Waves className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">No upcoming tryouts.</p>
        </div>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-medium text-primary"
          onClick={() => navigate("/tryouts")}
        >
          View all tryouts →
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {tryouts.map((x) => (
        <li key={x.name} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-aqua/15 text-aqua-foreground flex flex-col items-center justify-center">
            <Waves className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div
              className="text-sm font-medium hover:underline cursor-pointer"
              onClick={() => {
                navigate(`/tryouts/view/${x._id}`);
              }}
            >
              {x.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {x.startAt ? format(new Date(x.startAt), "MMM d, yyyy") : ""}
              {x.startAt && x.endAt ? " · " : ""}
              {x.endAt ? format(new Date(x.endAt), "MMM d, yyyy") : ""}
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {x.status}
          </Badge>
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

function SuperAdminDash() {
  const { data: adminState } = useAdminState();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={adminState?.totalUsers ?? 0} icon={Users} />
        <StatCard
          label="Total Clubs"
          value={adminState?.totalClubs ?? 0}
          icon={Building2}
          accent="aqua"
        />
        <StatCard
          label="Active Tryouts"
          value={adminState?.activeTryouts ?? 0}
          icon={Waves}
          accent="success"
        />
        <StatCard
          label="Pending Approvals"
          value={adminState?.pendingApprovals ?? 0}
          hint="Awaiting review"
          icon={Clock}
          accent="warning"
        />
      </div>
      {/* <div className="grid gap-4 lg:grid-cols-3">
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
      </div> */}
      {/* <Card
        title="Recent Activity"
        action={
          <Button variant="ghost" size="sm">
            View all
          </Button>
        }
      >
        <ActivityFeed />
      </Card> */}
    </div>
  );
}

function AdminDash() {
  const { data: clubState, isLoading: stateLoading } = useClubState();
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  console.info("clubState =>", clubState);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Members"
          value={clubState?.memberCount || 0}
          hint={`${clubState?.coachCount || 0} coaches`}
          icon={Users}
        />
        <StatCard
          label="Active Tryouts"
          value={clubState?.activeTryoutCount || 0}
          icon={Waves}
          accent="aqua"
        />
        <StatCard
          label="Total Tryouts"
          value={clubState?.tryoutCount || 0}
          icon={Trophy}
          accent="success"
        />
        <StatCard
          label="Registered Swimmers"
          value={clubState?.registeredSwimmerCount || 0}
          hint={`${clubState?.waitlistCount || 0} on waitlist`}
          icon={GraduationCap}
          accent="warning"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Club Summary">
          {stateLoading || !clubState ? (
            <div className="flex items-center justify-center h-24">
              <Clock10 className="animate-spin h-5 w-5 text-muted-foreground" />
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                ["Club name", clubState.club.name || "—"],
                ["Active members", `${clubState.memberCount} users`],
                ["Coaches", String(clubState.coachCount)],
                ["Total tryouts", String(clubState.tryoutCount)],
                ["Active tryouts", String(clubState.activeTryoutCount)],
                ["Registered swimmers", String(clubState.registeredSwimmerCount)],
                ["Waitlist count", String(clubState.waitlistCount)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
        <Card
          title="Recent 3 Users"
          // action={
          //   isAdmin ? (
          //     <Button
          //       variant="link"
          //       size="sm"
          //       className="h-auto p-0 text-xs font-medium text-primary"
          //       onClick={() => navigate("/users")}
          //     >
          //       View all →
          //     </Button>
          //   ) : undefined
          // }
        >
          <RecentUsers />
        </Card>
        <Card
          title="Upcoming Tryouts"
          // action={
          //   isAdmin ? (
          //     <Button
          //       variant="link"
          //       size="sm"
          //       className="h-auto p-0 text-xs font-medium text-primary"
          //       onClick={() => navigate("/tryouts")}
          //     >
          //       View all →
          //     </Button>
          //   ) : undefined
          // }
        >
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
                    className="h-full bg-linear-to-r from-primary to-aqua rounded-full"
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

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <PageShell title="Dashboard">
      {role === "super_admin" && <SuperAdminDash />}
      {role === "admin" && <AdminDash />}
      {role === "coach" && <AdminDash />}
    </PageShell>
  );
}
