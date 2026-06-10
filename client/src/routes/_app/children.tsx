import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Waves } from "lucide-react";

const kids = [
  { name: "Mia Davies", age: 12, level: "Level 4 — Advanced", tryouts: ["Spring 2026", "Junior Squad Eval"], initials: "MD" },
  { name: "Owen Davies", age: 9, level: "Level 2 — Intermediate", tryouts: ["AquaKids Open"], initials: "OD" },
];

export default function ChildrenPage() {
  return (
    <PageShell title="My Children" actions={<Button><Plus className="h-4 w-4 mr-1.5" /> Add child</Button>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kids.map((k) => (
          <div key={k.name} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-primary to-aqua relative">
              <div className="absolute -bottom-8 left-5 h-16 w-16 rounded-2xl bg-card border-4 border-card shadow flex items-center justify-center font-bold text-primary text-xl">
                {k.initials}
              </div>
            </div>
            <div className="p-5 pt-10">
              <h3 className="font-semibold">{k.name}</h3>
              <p className="text-sm text-muted-foreground">Age {k.age} · {k.level}</p>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-2">Registered tryouts</p>
                <div className="flex flex-wrap gap-1.5">
                  {k.tryouts.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                <Button variant="outline" size="sm" className="flex-1"><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                <Button size="sm" className="flex-1"><Waves className="h-3.5 w-3.5 mr-1" /> Register</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}