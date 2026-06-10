import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, Plus, Trash2, ArrowRight, ArrowLeft,
  Building2, Users, UserPlus, Sparkles, Mail, ShieldCheck, Trophy, CalendarCheck, Loader2,
} from "lucide-react";
import { useSaveStep1, useSaveStep2, useSubmitClub } from "@/hooks/use-onboarding";
import { useApiError } from "@/hooks/use-api-error";

type StepDef = { n: number; label: string; description: string; icon: React.ComponentType<{ className?: string }> };

const STEPS: StepDef[] = [
  { n: 1, label: "Club Details", description: "Tell us about your swimming club", icon: Building2 },
  { n: 2, label: "Invite Coaches", description: "Add coaches to help manage the club", icon: UserPlus },
  { n: 3, label: "Invite Parents", description: "Invite parents to register their children", icon: Users },
  { n: 4, label: "Review & Submit", description: "Review your setup before going live", icon: ShieldCheck },
];

const CLUB_SIZES = ["1–25", "26–50", "51–100", "101–250", "250+"];
const REGIONS = ["Northeast", "Southeast", "Midwest", "Southwest", "West", "Northwest", "International"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [clubName, setClubName] = useState("");
  const [clubSize, setClubSize] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [about, setAbout] = useState("");
  const [step1Errors, setStep1Errors] = useState<{ name?: string; address?: string; phone?: string }>({});
  const [coaches, setCoaches] = useState<string[]>([""]);
  const [parents, setParents] = useState<string[]>([""]);

  const saveStep1 = useSaveStep1();
  const saveStep2 = useSaveStep2();
  const submitClub = useSubmitClub();
  const { toastError } = useApiError();
  const isMutating = saveStep1.isPending || saveStep2.isPending || submitClub.isPending;

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const current = STEPS[step - 1];

  const handleContinue = () => {
    if (step === 1) {
      const errs: typeof step1Errors = {};
      if (clubName.trim().length < 2) errs.name = "Club name must be at least 2 characters";
      if (address.trim().length < 5) errs.address = "Address must be at least 5 characters";
      if (phone.trim().length < 7) errs.phone = "Phone must be at least 7 characters";
      else if (!/^[+\d\s\-().]+$/.test(phone.trim())) errs.phone = "Phone number is invalid (digits, spaces, +, -, (, ) only)";
      setStep1Errors(errs);
      if (Object.keys(errs).length) return;
      saveStep1.mutate(
        { name: clubName.trim(), address: address.trim(), phone: phone.trim() },
        { onSuccess: () => setStep(2), onError: toastError },
      );
    } else if (step === 2) {
      const validEmails = coaches.filter((e) => e.trim());
      if (validEmails.length === 0) { setStep(3); return; }
      saveStep2.mutate(
        { coachEmails: validEmails },
        { onSuccess: () => setStep(3), onError: toastError },
      );
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleFinish = () => {
    submitClub.mutate(undefined, {
      onSuccess: () => navigate("/dashboard"),
      onError: toastError,
    });
  };

  const addEmail = (list: string[], set: (v: string[]) => void) => set([...list, ""]);
  const removeEmail = (list: string[], set: (v: string[]) => void, i: number) =>
    set(list.filter((_, idx) => idx !== i));
  const updateEmail = (list: string[], set: (v: string[]) => void, i: number, val: string) => {
    const next = [...list]; next[i] = val; set(next);
  };

  return (
    <div className="min-h-screen w-full bg-muted/30 flex">
      <aside className="hidden lg:flex w-[380px] xl:w-[440px] flex-col bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-aqua/20 blur-3xl" />
        <div className="relative p-10 flex flex-col h-full">
          <BrandLogo size="md" />
          <div className="flex-1 flex flex-col justify-center mt-10 space-y-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${active ? "bg-white/10" : ""}`}>
                  <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold border-2 ${done ? "bg-primary border-primary text-primary-foreground" : active ? "border-primary text-primary bg-primary/10" : "border-background/30 text-background/40"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${active ? "text-background" : done ? "text-background/70" : "text-background/40"}`}>{s.label}</p>
                    <p className={`text-xs mt-0.5 ${active ? "text-background/70" : "text-background/30"}`}>{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto">
            <div className="h-1.5 rounded-full bg-background/10 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-background/40 mt-2">Step {step} of {STEPS.length}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <div className="flex items-center gap-4 p-6 border-b border-border bg-background/50 backdrop-blur lg:hidden">
          <BrandLogo size="sm" />
          <div className="flex gap-1 ml-auto">
            {STEPS.map((s) => (
              <div key={s.n} className={`h-1.5 w-8 rounded-full ${step >= s.n ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center p-6 md:p-10">
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {<current.icon className="h-5 w-5" />}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{current.label}</h1>
                <p className="text-sm text-muted-foreground">{current.description}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="clubName">Club name <span className="text-destructive">*</span></Label>
                    <Input
                      id="clubName"
                      placeholder="Pacific Wave Aquatics"
                      value={clubName}
                      onChange={(e) => { setClubName(e.target.value); setStep1Errors((p) => ({ ...p, name: undefined })); }}
                      className={step1Errors.name ? "border-destructive" : ""}
                    />
                    {step1Errors.name && <p className="text-xs text-destructive">{step1Errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                    <Input
                      id="address"
                      placeholder="123 Aqua Lane, San Diego, CA"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setStep1Errors((p) => ({ ...p, address: undefined })); }}
                      className={step1Errors.address ? "border-destructive" : ""}
                    />
                    {step1Errors.address && <p className="text-xs text-destructive">{step1Errors.address}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setStep1Errors((p) => ({ ...p, phone: undefined })); }}
                      className={step1Errors.phone ? "border-destructive" : ""}
                    />
                    {step1Errors.phone && <p className="text-xs text-destructive">{step1Errors.phone}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Club size</Label>
                      <Select value={clubSize} onValueChange={setClubSize}>
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>{CLUB_SIZES.map((s) => <SelectItem key={s} value={s}>{s} members</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Region</Label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span>Coaches will receive an invitation email to join your club.</span>
                  </div>
                  {coaches.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input type="email" placeholder="coach@club.com" value={c} onChange={(e) => updateEmail(coaches, setCoaches, i, e.target.value)} />
                      {coaches.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(coaches, setCoaches, i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addEmail(coaches, setCoaches)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add another coach
                  </Button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span>Parents will be invited to register their children for tryouts.</span>
                  </div>
                  {parents.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <Input type="email" placeholder="parent@example.com" value={p} onChange={(e) => updateEmail(parents, setParents, i, e.target.value)} />
                      {parents.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(parents, setParents, i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addEmail(parents, setParents)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add another parent
                  </Button>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Review your club setup before submitting for approval.</p>
                  <div className="rounded-xl border border-border divide-y divide-border">
                    {[
                      { icon: Building2, label: "Club Name", value: clubName || "—" },
                      { icon: Users, label: "Size", value: clubSize || "—" },
                      { icon: Trophy, label: "Address", value: address || "—" },
                      { icon: UserPlus, label: "Coaches invited", value: coaches.filter(Boolean).length.toString() },
                      { icon: CalendarCheck, label: "Parents invited", value: parents.filter(Boolean).length.toString() },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground flex-1">{label}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      After submission, a Super Admin will review your club. You'll receive an email once approved.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => step === 1 ? navigate("/login") : setStep(step - 1)}
                  className="text-muted-foreground"
                  disabled={isMutating}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  {step === 1 ? "Back to login" : "Previous"}
                </Button>
                <div className="flex items-center gap-2">
                  {(step === 2 || step === 3) && (
                    <Button variant="ghost" onClick={() => setStep(step + 1)} disabled={isMutating}>Skip for now</Button>
                  )}
                  {step < 4 ? (
                    <Button onClick={handleContinue} disabled={isMutating} className="h-10 px-5">
                      {isMutating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</> : <>Continue <ArrowRight className="h-4 w-4 ml-1.5" /></>}
                    </Button>
                  ) : (
                    <Button onClick={handleFinish} className="h-10 px-5" disabled={isMutating}>
                      {isMutating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</> : <>Enter dashboard <ArrowRight className="h-4 w-4 ml-1.5" /></>}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-8">
              Need help?{" "}
              <Link to="/login" className="text-foreground font-medium hover:underline">Contact support</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
