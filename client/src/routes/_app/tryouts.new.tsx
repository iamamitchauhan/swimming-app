import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  tryoutSchema,
  TryoutFormValues,
  WIZARD_STEPS,
  STEP_FIELDS,
  DEFAULT_STEPS,
  LEVELS,
} from "./tryout-steps/shared";
import { StepBasics } from "./tryout-steps/step-basics";
import { StepBranding } from "./tryout-steps/step-branding";
import { StepSessions } from "./tryout-steps/step-sessions";
import { StepSegments } from "./tryout-steps/step-segments";
import { StepHowItWorks } from "./tryout-steps/step-how-it-works";
import { StepPresentation } from "./tryout-steps/step-presentation";
import { StepRegistration } from "./tryout-steps/step-registration";
import { useCreateTryout } from "@/hooks/use-tryouts";
import { SelectedQuestion } from "@/lib/api/question-library.api";
import { tryoutsApi } from "@/lib/api/tryouts.api";

// ─── Main Component (Stepper Wizard Parent) ───────────────────────────────────

export default function TryoutNewPage() {
  const navigate = useNavigate();

  // ── Wizard state (owned here) ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const TOTAL_STEPS = WIZARD_STEPS.length;

  // ── Banner state (owned here, passed to StepBranding) ────────────────────────
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  // ── Registration questions state ──────────────────────────────────────────────
  const [registrationQuestions, setRegistrationQuestions] = useState<SelectedQuestion[]>([]);

  // ── Submission state ─────────────────────────────────────────────────────────
  const [apiError, setApiError] = useState<string>("");
  const createMutation = useCreateTryout();

  // ── Single form instance — all state lives here ──────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<TryoutFormValues>({
    resolver: zodResolver(tryoutSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      location: "",
      description: "",
      theme: "ocean",
      bannerUrl: "",
      sessions: [{ date: "", startTime: "", endTime: "", label: "" }],
      slotDuration: 30,
      lanesAvailable: 6,
      swimmersPerLane: 4,
      segments: [
        {
          name: "",
          minAge: 5,
          maxAge: 10,
          level: LEVELS[0],
        },
      ],
      steps: DEFAULT_STEPS,
      additionalInstructions: "",
      ctaLabel: "Reserve your slot",
      highlights: "",
      faqs: [{ question: "", answer: "" }],
    },
  });

  // ── Field arrays (owned here, passed down as props) ──────────────────────────
  const sessionsField = useFieldArray({ control, name: "sessions" });
  const segmentsField = useFieldArray({ control, name: "segments" });
  const stepsField = useFieldArray({ control, name: "steps" });
  const faqsField = useFieldArray({ control, name: "faqs" });

  // ── Navigation ───────────────────────────────────────────────────────────────

  async function goNext() {
    const stepKey = currentStep as keyof typeof STEP_FIELDS;
    const fields = STEP_FIELDS[stepKey];
    // Step 4 (segments) needs full-form trigger so nested array fields validate
    const valid = await (fields.length === 0 || currentStep === 4 ? trigger() : trigger(fields));
    if (!valid) return;
    if (currentStep === 7) {
      await handleSubmit(onSaveAsDraft)();
      return;
    }
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  // ── Submission ───────────────────────────────────────────────────────────────

  async function onSaveAsDraft(data: TryoutFormValues) {
    setApiError("");
    try {
      const swimmersPerSlot = data.lanesAvailable * data.swimmersPerLane;
      const created = await createMutation.mutateAsync({
        ...data,
        swimmersPerSlot,
        status: "draft",
        banner: bannerFile ?? undefined,
      });
      if (registrationQuestions.length > 0) {
        await tryoutsApi.saveRegistrationQuestions(created._id, registrationQuestions);
      }
      navigate(`/tryouts/edit/${created._id}?step=8`, { replace: true });
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const isLastStep = currentStep === TOTAL_STEPS;
  const isSubmitting = createMutation.isPending;

  return (
    <PageShell
      title="New Tryout"
      crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "New" }]}
    >
      <div className="flex gap-0 h-[calc(100vh-130px)]">
        {/* ── Vertical tab sidebar ────────────────────────────────────────────── */}
        <nav className="w-44 shrink-0 sticky top-[60px] self-start pt-2">
          {WIZARD_STEPS.map((step) => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => (isDone || isCurrent) && setCurrentStep(step.id)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-l-2",
                  isCurrent
                    ? "border-l-primary text-primary"
                    : isDone
                      ? "border-l-transparent text-muted-foreground hover:text-foreground hover:border-l-border cursor-pointer"
                      : "border-l-transparent text-muted-foreground/50 cursor-default",
                )}
              >
                {step.label}
              </button>
            );
          })}
        </nav>

        {/* ── Right panel ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-l border-border pl-8 overflow-hidden">
          {/* Step heading */}
          <div className="shrink-0 pt-2 pb-6">
            <h2 className="text-xl font-bold text-foreground">
              {WIZARD_STEPS[currentStep - 1].label}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {WIZARD_STEPS[currentStep - 1].description}
            </p>
          </div>

          {/* ── API Error ────────────────────────────────────────────────────── */}
          {apiError && (
            <div className="shrink-0 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {/* ── Step content ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto min-h-0 pb-5">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <form onSubmit={(e) => e.preventDefault()}>
                {currentStep === 1 && (
                  <StepBasics register={register} watch={watch} errors={errors} />
                )}

                {currentStep === 2 && (
                  <StepBranding
                    watch={watch}
                    setValue={setValue}
                    bannerFile={bannerFile}
                    bannerPreview={bannerPreview}
                    onFileChange={(file, preview) => {
                      setBannerFile(file);
                      setBannerPreview(preview);
                    }}
                  />
                )}

                {currentStep === 3 && (
                  <StepSessions
                    register={register}
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    errors={errors}
                    sessionsField={sessionsField}
                  />
                )}

                {currentStep === 4 && (
                  <StepSegments
                    register={register}
                    control={control}
                    errors={errors}
                    segmentsField={segmentsField}
                  />
                )}

                {currentStep === 5 && (
                  <StepHowItWorks register={register} stepsField={stepsField} />
                )}

                {currentStep === 6 && (
                  <StepRegistration
                    selectedQuestions={registrationQuestions}
                    onChange={setRegistrationQuestions}
                  />
                )}

                {currentStep === 7 && (
                  <StepPresentation register={register} faqsField={faqsField} />
                )}
              </form>
            </div>
          </div>

          {/* ── Footer nav ───────────────────────────────────────────────────── */}
          <div className="shrink-0 py-4 flex items-center justify-between gap-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={currentStep === 1 ? () => navigate("/tryouts") : goBack}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              {currentStep === 7 && isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              {currentStep === 7 ? "Review and Publish" : "Continue"}
              {!isSubmitting && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
