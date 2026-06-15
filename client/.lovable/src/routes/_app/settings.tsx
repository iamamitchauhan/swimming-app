import { PageShell } from "@/components/page-shell";
import { Switch } from "@/components/ui/switch";

const sections = [
  { title: "Notifications", items: [
    { name: "Email digest", desc: "Weekly summary of club activity.", on: true },
    { name: "Tryout reminders", desc: "Get notified 24h before a tryout.", on: true },
    { name: "New registrations", desc: "Notify me when a swimmer signs up.", on: false },
  ]},
  { title: "Privacy", items: [
    { name: "Public club page", desc: "Allow parents to discover your club.", on: true },
    { name: "Show evaluation results", desc: "Make results visible to parents.", on: false },
  ]},
];

export default function SettingsPage() {
  return (
    <PageShell title="Settings">
      <div className="space-y-6 max-w-3xl">
        {sections.map((s) => (
          <div key={s.title} className="bg-card rounded-xl border border-border divide-y divide-border">
            <h3 className="font-semibold px-6 py-4">{s.title}</h3>
            {s.items.map((it) => (
              <div key={it.name} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                </div>
                <Switch defaultChecked={it.on} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </PageShell>
  );
}