import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  LEVELS,
} from "./tryout-steps/shared";
import { StepBasics } from "./tryout-steps/step-basics";
import { StepBranding } from "./tryout-steps/step-branding";
import { StepSessions } from "./tryout-steps/step-sessions";
import { StepSegments } from "./tryout-steps/step-segments";
import { StepHowItWorks } from "./tryout-steps/step-how-it-works";
import { StepPresentation } from "./tryout-steps/step-presentation";
import { StepReviewPublish } from "./tryout-steps/step-review-publish";
import { StepRegistration } from "./tryout-steps/step-registration";
import { useTryout, useUpdateTryout, usePublishTryout } from "@/hooks/use-tryouts";
import { SelectedQuestion } from "@/lib/api/question-library.api";
import { tryoutsApi } from "@/lib/api/tryouts.api";
import { useAuthStore } from "@/lib/auth.store";
import { toast } from "sonner";

// ─── Edit Page ────────────────────────────────────────────────────────────────

export default function TryoutEditPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Wizard state ─────────────────────────────────────────────────────────────
  const initialStep = Number(searchParams.get("step")) || 1;
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const TOTAL_STEPS = WIZARD_STEPS.length;

  // ── Banner state ─────────────────────────────────────────────────────────────
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");

  // ── Registration questions state ──────────────────────────────────────────────
  const [registrationQuestions, setRegistrationQuestions] = useState<SelectedQuestion[]>([]);

  // ── Submission state ─────────────────────────────────────────────────────────
  const [apiError, setApiError] = useState<string>("");

  // ── Fetch existing tryout ────────────────────────────────────────────────────
  const { data: tryout, isLoading, isError, error } = useTryout(id);
  const updateMutation = useUpdateTryout(id);
  const publishMutation = usePublishTryout();
  const userRole = useAuthStore((s) => s.user?.role);
  const canAccessReview =
    userRole === "admin" || userRole === "super_admin" || userRole === "coach";

  // ── Form ─────────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
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
      segments: [
        {
          name: "",
          minAge: 5,
          maxAge: 10,
          level: LEVELS[0],
        },
      ],
      steps: [],
      additionalInstructions: "",
      ctaLabel: "Reserve your slot",
      highlights: "",
      faqs: [{ question: "", answer: "" }],
    },
  });

  // ── Guard: redirect if tryout is not editable ────────────────────────────────
  useEffect(() => {
    if (!tryout) return;

    const isEditable =
      tryout.status === "draft" ||
      (["published", "open"].includes(tryout.status) && (tryout.registeredCount ?? 0) === 0);
    if (!isEditable) navigate("/tryouts", { replace: true });
  }, [tryout, navigate]);

  // ── Populate form once data loads ────────────────────────────────────────────
  useEffect(() => {
    if (!tryout) return;
    reset({
      name: tryout.name,
      location: tryout.location ?? "",
      description: tryout.description ?? "",
      theme: tryout.theme as TryoutFormValues["theme"],
      bannerUrl: tryout.bannerUrl ?? "",
      sessions: tryout.sessions?.length
        ? tryout.sessions
        : [{ date: "", startTime: "", endTime: "", label: "" }],
      slotDuration: tryout.slotDuration,
      swimmersPerSlot: tryout.swimmersPerSlot,
      segments: tryout.segments ?? [],
      steps: tryout.steps ?? [],
      additionalInstructions: tryout.additionalInstructions ?? "",
      ctaLabel: tryout.ctaLabel,
      highlights: tryout.highlights ?? "",
      faqs: tryout.faqs ?? [],
    });
    if (tryout.bannerUrl) setBannerPreview(tryout.bannerUrl);
    // Load existing registration questions from collection
    tryoutsApi.getRegistrationQuestions(id).then((qs) => {
      if (qs.length) setRegistrationQuestions(qs);
    });
  }, [tryout, reset, id]);

  // ── Field arrays ─────────────────────────────────────────────────────────────
  const sessionsField = useFieldArray({ control, name: "sessions" });
  const segmentsField = useFieldArray({ control, name: "segments" });
  const stepsField = useFieldArray({ control, name: "steps" });
  const faqsField = useFieldArray({ control, name: "faqs" });

  // ── Form values for preview ──────────────────────────────────────────────────
  const formValues = watch();

  // ── Navigation ───────────────────────────────────────────────────────────────
  async function goNext() {
    const stepKey = currentStep as keyof typeof STEP_FIELDS;
    const fields = STEP_FIELDS[stepKey];
    // Step 4 (segments) needs full-form trigger so nested array fields validate
    const valid = await (fields.length === 0 || currentStep === 4 ? trigger() : trigger(fields));
    if (!valid) return;
    if (currentStep === 7) {
      await onSaveAndAdvance(formValues);
      return;
    }
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1));
  }

  // ── Save & advance to Review step ────────────────────────────────────────────
  async function onSaveAndAdvance(data: TryoutFormValues) {
    setApiError("");
    try {
      await updateMutation.mutateAsync({
        ...data,
        status: "draft",
        banner: bannerFile ?? undefined,
      });
      await tryoutsApi.saveRegistrationQuestions(id, registrationQuestions);
      setCurrentStep(8);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ── Submit (update) ──────────────────────────────────────────────────────────
  async function onSubmit(data: TryoutFormValues, status: "draft" | "open") {
    setApiError("");
    updateMutation.mutate(
      { ...data, status, banner: bannerFile ?? undefined },
      {
        onSuccess: () => navigate("/tryouts"),
        onError: (err: unknown) =>
          setApiError(err instanceof Error ? err.message : "Something went wrong."),
      },
    );
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  async function onPublish() {
    setApiError("");
    try {
      await publishMutation.mutateAsync(id);
      toast.success("Tryout published successfully!");
      navigate("/tryouts");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Failed to publish. Please try again.");
    }
  }

  async function onSaveAsDraft() {
    setApiError("");
    try {
      await updateMutation.mutateAsync({
        ...formValues,
        status: "draft",
        banner: bannerFile ?? undefined,
      });
      toast.success("Tryout saved as draft successfully!");
      navigate("/tryouts");
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "Failed to save as draft. Please try again.",
      );
    }
  }

  const isLastStep = currentStep === TOTAL_STEPS;
  const isSubmitting = updateMutation.isPending || publishMutation.isPending;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell
        title="Edit Tryout"
        crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "Edit" }]}
      >
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading tryout…</span>
        </div>
      </PageShell>
    );
  }

  // ── Fetch error ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <PageShell
        title="Edit Tryout"
        crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "Edit" }]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/tryouts")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        }
      >
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error instanceof Error ? error.message : "Failed to load tryout."}</span>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Edit: ${tryout?.name ?? "Tryout"}`}
      crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "Edit" }]}
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
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-l-2 cursor-pointer",
                  isCurrent
                    ? "border-l-primary text-primary"
                    : isDone
                      ? "border-l-transparent text-muted-foreground hover:text-foreground hover:border-l-border"
                      : "border-l-transparent text-muted-foreground/50 hover:text-foreground hover:border-l-border",
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

                {currentStep === 8 &&
                  (canAccessReview ? (
                    <StepReviewPublish
                      values={formValues}
                      bannerPreview={bannerPreview}
                      onPublish={onPublish}
                      onSaveAsDraft={onSaveAsDraft}
                      onBack={() => setCurrentStep(7)}
                      isPending={isSubmitting}
                      canPublish={canAccessReview}
                      selectedQuestions={registrationQuestions}
                    />
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      You do not have permission to publish tryouts.
                    </div>
                  ))}
              </form>
            </div>
          </div>

          {/* ── Footer nav ───────────────────────────────────────────────────── */}
          {currentStep !== 8 && (
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

              {!isLastStep && (
                <Button type="button" onClick={goNext} disabled={isSubmitting}>
                  {currentStep === 7 && isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  {currentStep === 7 ? "Save & Continue" : "Continue"}
                  {!isSubmitting && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
