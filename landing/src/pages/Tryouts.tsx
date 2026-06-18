import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TryoutCard } from "@/components/tryouts/TryoutCard";
import { tryoutsQuery } from "@/lib/queries";
import { uniqueValues, type TryoutFilters } from "@/lib/api/tryouts";

export default function TryoutsPage() {
  const [filters, setFilters] = useState<TryoutFilters>({ sort: "latest" });
  const { data: tryouts = [], isFetching } = useQuery(tryoutsQuery(filters));
  const ageGroups = uniqueValues("ageGroup");
  const states = uniqueValues("state");
  const cities = uniqueValues("city");
  const clubs = uniqueValues("club");
  const update = <K extends keyof TryoutFilters>(k: K, v: TryoutFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Browse Tryouts</h1>
        <p className="mt-2 text-muted-foreground">
          {tryouts.length} tryout{tryouts.length === 1 ? "" : "s"} available
        </p>
      </header>
      {/* <div className="mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by tryout name, club, or city…" value={filters.search ?? ""} onChange={(e) => update("search", e.target.value)} className="pl-9" />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <FilterSelect placeholder="Age group" value={filters.ageGroup} options={ageGroups} onChange={(v) => update("ageGroup", v)} />
          <FilterSelect placeholder="State" value={filters.state} options={states} onChange={(v) => update("state", v)} />
          <FilterSelect placeholder="City" value={filters.city} options={cities} onChange={(v) => update("city", v)} />
          <FilterSelect placeholder="Club" value={filters.club} options={clubs} onChange={(v) => update("club", v)} />
          <Select value={filters.sort} onValueChange={(v) => update("sort", v as TryoutFilters["sort"])}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="earliest">Earliest Date</SelectItem>
              <SelectItem value="most_slots">Most Available Slots</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setFilters({ sort: "earliest" })}>Clear filters</Button></div>
      </div> */}
      {isFetching && tryouts.length === 0 ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : tryouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No tryouts match your filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tryouts.map((t) => (
            <TryoutCard key={t.id} tryout={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? undefined : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">All {placeholder.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
