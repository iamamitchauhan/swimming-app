import { useRef } from "react";
import { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, tryoutCoverPhotos } from "@/lib/utils";
import { THEMES, TryoutFormValues } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  watch: UseFormWatch<TryoutFormValues>;
  setValue: UseFormSetValue<TryoutFormValues>;
  bannerFile: File | null;
  bannerPreview: string;
  onFileChange: (file: File | null, preview: string) => void;
}

export function StepBranding({ watch, setValue, bannerFile, bannerPreview, onFileChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const watchedTheme = watch("theme");
  const watchedUrl = watch("bannerUrl") ?? "";

  const selectedTheme = THEMES.find((t) => t.id === watchedTheme) ?? THEMES[0];
  const activeBannerPreview = bannerPreview || watchedUrl;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onFileChange(file, preview);
    setValue("bannerUrl", "");
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("bannerUrl", e.target.value);
    if (e.target.value) {
      onFileChange(null, "");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearBanner() {
    onFileChange(null, "");
    setValue("bannerUrl", "");
    if (fileRef.current) fileRef.current.value = "";
  }

  const coverPhotos = tryoutCoverPhotos();

  function handleSelectCover(url: string) {
    setValue("bannerUrl", url);
    onFileChange(null, "");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Cover Photos — primary action first */}
      <FieldGroup label="Cover Photos" hint="Pick a preset cover image.">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 mt-1">
          {coverPhotos.map((url, idx) => {
            const active = watchedUrl === url;
            return (
              <button
                key={url}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectCover(url)}
                className={cn(
                  "group relative overflow-hidden rounded-lg border transition-all aspect-video",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "border-primary shadow-sm ring-1 ring-primary"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <img
                  src={url}
                  alt={`Cover option ${idx + 1}`}
                  loading="lazy"
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-200",
                    !active && "group-hover:scale-[1.05]",
                  )}
                />
                {active && (
                  <>
                    <div className="absolute inset-0 bg-primary/10" />
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Preview — compact, right below selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Preview</p>
          {activeBannerPreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={clearBanner}
            >
              <X className="h-3 w-3 mr-1" /> Remove banner
            </Button>
          )}
        </div>
        <div className="rounded-xl overflow-hidden border border-border h-48 relative bg-muted">
          {activeBannerPreview ? (
            <img
              src={activeBannerPreview}
              alt="Banner preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-linear-to-br flex flex-col items-center justify-center gap-1.5",
                selectedTheme.from,
                selectedTheme.to,
              )}
            >
              <span className="text-white/90 text-sm font-medium">{selectedTheme.label}</span>
              <span className="text-white/60 text-xs">Select a cover photo above</span>
            </div>
          )}
        </div>
      </div>

      {/* Color Theme — compact bottom row */}
      <FieldGroup label="Color Theme" hint="Used when no banner is set.">
        <div className="flex flex-wrap gap-2 mt-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setValue("theme", t.id as TryoutFormValues["theme"])}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                watchedTheme === t.id
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className={cn("h-3.5 w-3.5 rounded-full bg-linear-to-br", t.from, t.to)} />
              {t.label}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}
