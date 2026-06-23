import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchInput } from "@/components/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TryoutCard } from "@/components/tryouts/TryoutCard";
import { tryoutsQuery, clubsQuery } from "@/lib/queries";
import { AGE_GROUP_OPTIONS, type TryoutFilters } from "@/lib/api/tryouts";

export default function TryoutsPage() {
  const [filters, setFilters] = useState<TryoutFilters>({ sort: "latest", page: 1, limit: 12 });

  const { data: result, isFetching } = useQuery(tryoutsQuery(filters));
  const { tryouts = [], total = 0, page = 1, totalPages = 1 } = result ?? {};
  const { data: clubs = [] } = useQuery(clubsQuery());

  const update = <K extends keyof TryoutFilters>(k: K, v: TryoutFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const selectedAgeGroup = AGE_GROUP_OPTIONS.find(
    (g) => g.minAge === filters.minAge && g.maxAge === filters.maxAge,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Browse Tryouts</h1>
        <p className="mt-2 text-muted-foreground">
          {tryouts.length} tryout{tryouts.length === 1 ? "" : "s"} available
        </p>
      </header>
      <div className="mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <SearchInput
            placeholder="Search by tryout name, club"
            value={filters.search ?? ""}
            onChange={(v) => update("search", v)}
            className="flex-1"
            debounceMs={300}
          />
          <Select
            value={selectedAgeGroup ? selectedAgeGroup.label : "__all"}
            onValueChange={(v) => {
              if (v === "__all") {
                setFilters((f) => ({ ...f, minAge: undefined, maxAge: undefined, page: 1 }));
              } else {
                const g = AGE_GROUP_OPTIONS.find((o) => o.label === v);
                if (g) setFilters((f) => ({ ...f, minAge: g.minAge, maxAge: g.maxAge, page: 1 }));
              }
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Age group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All age groups</SelectItem>
              {AGE_GROUP_OPTIONS.map((g) => (
                <SelectItem key={g.label} value={g.label}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.clubId ?? "__all"}
            onValueChange={(v) => update("clubId", v === "__all" ? undefined : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All clubs</SelectItem>
              {clubs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.sort ?? "latest"}
            onValueChange={(v) => update("sort", v as TryoutFilters["sort"])}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="earliest">Earliest Date</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ sort: "latest", page: 1, limit: 12 })}
          >
            Clear
          </Button>
        </div>
      </div>
      {isFetching && tryouts.length === 0 ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : tryouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No tryouts match your filters.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tryouts.map((t) => (
              <TryoutCard key={t.id} tryout={t} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} &middot; {total} tryouts
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
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
