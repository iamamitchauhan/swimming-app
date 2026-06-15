import { useRef } from "react";
import { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-foreground">Branding</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize the look of your public event page.
        </p>
      </div>

      {/* Theme */}
      <FieldGroup label="Color Theme">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setValue("theme", t.id as TryoutFormValues["theme"])}
              className={cn(
                "rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                watchedTheme === t.id
                  ? "border-primary shadow-md scale-[1.04]"
                  : "border-transparent hover:border-border",
              )}
            >
              <div className={cn("h-16 w-full bg-linear-to-br", t.from, t.to)} />
              <div className="py-1.5 text-center text-xs font-medium bg-card text-foreground">
                {t.label}
              </div>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Banner source */}
      <div className="grid gap-4 sm:grid-cols-1">
        {/* <FieldGroup label="Upload Banner Image" hint="PNG, JPG, or WEBP. Clears the URL below.">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors",
              bannerFile
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30",
            )}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center leading-relaxed">
              {bannerFile ? (
                <span className="text-foreground font-medium">{bannerFile.name}</span>
              ) : (
                "Click to upload"
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </FieldGroup> */}

        <FieldGroup label="Image URL" hint="Paste a direct image URL. Clears uploaded file.">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://example.com/banner.jpg"
              className="pl-9"
              value={watchedUrl}
              onChange={handleUrlChange}
            />
          </div>
        </FieldGroup>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Preview</p>
        <div className="rounded-xl overflow-hidden border border-border h-44 relative">
          {activeBannerPreview ? (
            <>
              <img
                src={activeBannerPreview}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                Banner
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={clearBanner}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <div
              className={cn(
                "w-full h-full bg-linear-to-br flex items-center justify-center",
                selectedTheme.from,
                selectedTheme.to,
              )}
            >
              <span className="text-white/80 text-sm font-medium">
                {selectedTheme.label} theme
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
