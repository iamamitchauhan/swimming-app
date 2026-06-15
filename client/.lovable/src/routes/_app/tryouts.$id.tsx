import { useParams } from "react-router-dom";
import { PageShell } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users2, Waves, UserCog, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function TryoutDetail() {
  const { id = "" } = useParams();
  return (
    <PageShell
      title="Spring Tryouts 2026"
      crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: id }]}
      actions={<Button variant="outline"><Pencil className="h-4 w-4 mr-1.5" /> Edit</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <InfoTile icon={CalendarDays} label="Date" value="Mar 15, 2026" />
        <InfoTile icon={MapPin} label="Location" value="Pacific Pool, Lane 1–4" />
        <InfoTile icon={Users2} label="Registrations" value="42 / 60" />
        <InfoTile icon={Waves} label="Status" value={<Badge className="bg-success/10 text-success border-success/20" variant="outline">Open</Badge>} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coach">Coach Information</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluation Results</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="bg-card rounded-xl border border-border p-6 space-y-3">
            <h3 className="font-semibold">About this tryout</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Spring tryouts for swimmers aged 10–14 looking to join Pacific Wave's competitive squad.
              Athletes will be evaluated on freestyle, backstroke, breaststroke, and butterfly across two pool sessions.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="coach" className="mt-4">
          <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center font-semibold">ER</div>
            <div>
              <p className="font-semibold flex items-center gap-2">Elena Reyes <Badge variant="secondary"><UserCog className="h-3 w-3 mr-1" /> Head Coach</Badge></p>
              <p className="text-sm text-muted-foreground">elena@pacificwave.io · 12 years experience</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="registrations" className="mt-4">
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Swimmer</TableHead><TableHead>Age</TableHead><TableHead>Parent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  ["Mia Davies", 12, "Jordan Davies", "Confirmed"],
                  ["Liam Okafor", 11, "Aisha Okafor", "Pending"],
                  ["Zoe Kim", 13, "S. Kim", "Confirmed"],
                  ["Noah Patel", 10, "R. Patel", "Waitlist"],
                ].map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r[0]}</TableCell>
                    <TableCell>{r[1]}</TableCell>
                    <TableCell className="text-muted-foreground">{r[2]}</TableCell>
                    <TableCell><Badge variant="secondary">{r[3]}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="evaluations" className="mt-4">
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Waves className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h3 className="font-semibold mt-3">No evaluations yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Evaluation results will appear here after the tryout.</p>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{className?:string}>; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}