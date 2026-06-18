import Field from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";

const DefaultFormUI = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Default Form Fields</span>
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {open && (
          <div className="p-3 space-y-2">
            <div>
              {/* ── Fixed: Swimmer name ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Swimmer first name" required>
                  <Input placeholder="First name" readOnly />
                </Field>
                <Field label="Swimmer last name" required>
                  <Input placeholder="Last name" readOnly />
                </Field>
              </div>
              {/* ── Fixed: Age + Segment ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Age on tryout day" required>
                  <Input type="number" min={1} max={30} placeholder="e.g. 10" readOnly />
                </Field>
                <Field label="Registration segment" required>
                  <Select disabled={true}>
                    <SelectTrigger>
                      <SelectValue placeholder={"Select Segment"} />
                    </SelectTrigger>
                    <SelectContent>
                      {[{ name: "Segment A" }, { name: "Segment B" }].map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {/* ── Fixed: Guardian ─────────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Guardian name" required>
                  <Input placeholder="Full name" readOnly />
                </Field>
                <Field label="Guardian email" required>
                  <Input type="email" placeholder="name@domain.com" readOnly />
                </Field>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaultFormUI;
