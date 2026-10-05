import { useState, type DragEvent } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionsDropzoneProps {
  onSelectFile: (file: File) => void;
  onPickFile: () => void;
  onDownloadTemplate: () => void;
  isPreviewing: boolean;
  isDownloading: boolean;
  error: string | null;
}

/** Empty-state uploader shown when the club question bank has no questions. */
export function QuestionsDropzone({
  onSelectFile,
  onPickFile,
  onDownloadTemplate,
  isPreviewing,
  isDownloading,
  error,
}: QuestionsDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        )}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Drop your CSV or Excel file here</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your file to get started, or browse from your device.
        </p>
        <Button className="mt-5" onClick={onPickFile} disabled={isPreviewing}>
          {isPreviewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Choose file
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">or drag and drop · .csv, .xlsx, .xls</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Download CSV template</p>
            <p className="text-sm text-muted-foreground">
              A ready-made file with the required columns and example rows.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onDownloadTemplate} disabled={isDownloading}>
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>
      </div>
    </div>
  );
}
