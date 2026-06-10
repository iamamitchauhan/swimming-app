import { Link } from "react-router-dom";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Filter, ArrowUpDown, MoreHorizontal, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight,
} from "lucide-react";


const data = [
  { id: "t1", name: "Spring Tryouts 2026", club: "Pacific Wave", coach: "Elena Reyes", date: "Mar 15, 2026", status: "Open", reg: 42 },
  { id: "t2", name: "Junior Squad Eval", club: "Pacific Wave", coach: "Marcus Tan", date: "Mar 22, 2026", status: "Open", reg: 18 },
  { id: "t3", name: "Open Water Trial", club: "AquaKids", coach: "Priya Shah", date: "Apr 02, 2026", status: "Draft", reg: 0 },
  { id: "t4", name: "National Squad Selection", club: "Coastal Surge", coach: "J. Kim", date: "Apr 15, 2026", status: "Closed", reg: 120 },
  { id: "t5", name: "Summer Distance Camp", club: "Riverside Otters", coach: "T. Brooks", date: "May 04, 2026", status: "Open", reg: 33 },
];

const statusVariant: Record<string, string> = {
  Open: "bg-success/10 text-success border-success/20",
  Draft: "bg-muted text-muted-foreground border-border",
  Closed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function TryoutsList() {
  return (
    <PageShell
      title="Tryouts"
      actions={<Button><Plus className="h-4 w-4 mr-1.5" /> New tryout</Button>}
    >
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tryouts…" className="pl-9 h-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9"><Filter className="h-4 w-4 mr-1.5" /> Filters</Button>
          <Button variant="outline" size="sm" className="h-9"><ArrowUpDown className="h-4 w-4 mr-1.5" /> Sort</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox /></TableHead>
                <TableHead>Tryout</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Registrations</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Checkbox /></TableCell>
                  <TableCell>
                    <Link to="/tryouts/$id" params={{ id: r.id }} className="font-medium hover:text-primary">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.club}</TableCell>
                  <TableCell className="text-muted-foreground">{r.coach}</TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusVariant[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.reg}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                        <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-muted-foreground border-t border-border">
          <span>Showing 1–5 of 24</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">1</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">2</Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">3</Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}