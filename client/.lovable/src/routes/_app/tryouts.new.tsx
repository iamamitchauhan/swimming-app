import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  tryoutSchema,
  TryoutFormValues,
  WIZARD_STEPS,
  STEP_FIELDS,
  DEFAULT_STEPS,
} from "./tryout-steps/shared";
import { StepBasics } from "./tryout-steps/step-basics";
import { StepBranding } from "./tryout-steps/step-branding";
import { StepSessions } from "./tryout-steps/step-sessions";
import { StepSegments } from "./tryout-steps/step-segments";
import { StepHowItWorks } from "./tryout-steps/step-how-it-works";
import { StepPresentation } from "./tryout-steps/step-presentation";
import { useCreateTryout } from "@/hooks/use-tryouts";

// ─── Main Component (Stepper Wizard Parent) ───────────────────────────────────

export default function TryoutNewPage() {
  const navigate = useNavigate();

  // ── Wizard state (owned here) ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);
  const TOTAL_STEPS = WIZARD_STEPS.length;

  // ── Banner state (owned here, passed to StepBranding) ────────────────────────
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

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
    getValues,
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
      swimmersPerSlot: 4,
      segments: [],
      steps: DEFAULT_STEPS,
      additionalInstructions: "",
      ctaLabel: "Sign up today",
      highlights: "",
      faqs: [],
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
    const valid = await trigger(STEP_FIELDS[stepKey]);
    if (valid) setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  // ── Submission ───────────────────────────────────────────────────────────────

  async function onSubmit(data: TryoutFormValues, status: "draft" | "open") {
    setApiError("");
    try {
      await createMutation.mutateAsync({
        ...data,
        status,
        banner: bannerFile ?? undefined,
      });
      navigate("/tryouts");
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
      <div className="max-w-2xl mx-auto">

        {/* ── Stepper header ─────────────────────────────────────────────────── */}
        <div className="sticky top-[60px] z-10 bg-background/95 backdrop-blur-sm py-4 mb-4 -mx-4 px-4 lg:-mx-8 lg:px-8">
          {/* Progress bar */}
          <div className="flex items-center gap-0 mb-6">
            {WIZARD_STEPS.map((step, i) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isLast = i === WIZARD_STEPS.length - 1;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  {/* Circle */}
                  <button
                    type="button"
                    onClick={() => isDone && setCurrentStep(step.id)}
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                      isDone
                        ? "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground cursor-default",
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : step.id}
                  </button>
                  {/* Connector */}
                  {!isLast && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-1 transition-colors",
                        isDone ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current step label */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Step {currentStep} of {TOTAL_STEPS}
            </p>
            <h2 className="text-xl font-bold text-foreground mt-0.5">
              {WIZARD_STEPS[currentStep - 1].label}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {WIZARD_STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* ── API Error ──────────────────────────────────────────────────────── */}
        {apiError && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ── Step content card ──────────────────────────────────────────────── */}
        <div className="min-h-[calc(100vh-525px)]"> 
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm ">
          <form onSubmit={(e) => e.preventDefault()}>

            {currentStep === 1 && (
              <StepBasics register={register} errors={errors} />
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
              <StepHowItWorks
                register={register}
                stepsField={stepsField}
              />
            )}

            {currentStep === 6 && (
              <StepPresentation
                register={register}
                faqsField={faqsField}
              />
            )}

          </form>
        </div>
        </div>

      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm py-4 mb-4 -mx-4 px-4 lg:-mx-8 lg:px-8">
        <div className="max-w-2xl mx-auto px-4 lg:px-0 py-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={currentStep === 1 ? () => navigate("/tryouts") : goBack}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleSubmit((d) => onSubmit(d, "draft"))}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit((d) => onSubmit(d, "open"))}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Publish
                </Button>
              </>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
