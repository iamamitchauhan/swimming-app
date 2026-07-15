import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i));
const SECOND_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MS_OPTIONS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"));

function parseSwimTime(value: string, defaultUnit: string) {
  const trimmed = value.trim();
  if (!trimmed) return { minutes: "", seconds: "", ms: "", unit: defaultUnit };
  const parts = trimmed.split(" ");
  const timePart = parts[0] ?? "";
  const unitPart = parts[1] ?? defaultUnit;
  const timeMatch = timePart.match(/^(\d+)?:(\d+)?\.(\d+)?$/);
  if (timeMatch) {
    return {
      minutes: timeMatch[1] ?? "",
      seconds: timeMatch[2] ?? "",
      ms: timeMatch[3] ?? "",
      unit: unitPart,
    };
  }
  return { minutes: "", seconds: "", ms: "", unit: unitPart };
}

function buildSwimTimeValue(minutes: string, seconds: string, ms: string, unit: string) {
  const hasAny = minutes || seconds || ms;
  if (!hasAny) return "";
  const m = minutes || "0";
  const s = seconds || "00";
  const paddedMs = ms || "00";
  return `${m}:${s}.${paddedMs} ${unit}`;
}

interface SwimTimeFieldProps {
  value?: string;
  onChange?: (val: string) => void;
  unitOptions?: string[];
  disabled?: boolean;
}

export function SwimTimeField({
  value = "",
  onChange,
  unitOptions = ["yards", "meters"],
  disabled = false,
}: SwimTimeFieldProps) {
  const defaultUnit = unitOptions[0] ?? "yards";
  const { minutes, seconds, ms, unit } = parseSwimTime(value, defaultUnit);

  function update(next: Partial<{ minutes: string; seconds: string; ms: string; unit: string }>) {
    if (disabled || !onChange) return;
    const newVal = buildSwimTimeValue(
      next.minutes ?? minutes,
      next.seconds ?? seconds,
      next.ms ?? ms,
      next.unit ?? unit,
    );
    onChange(newVal);
  }

  const minuteValue = minutes ? String(Number(minutes)) : "";
  const secondValue = seconds ? String(Number(seconds)).padStart(2, "0") : "";
  const msValue = ms ? String(Number(ms)).padStart(2, "0") : "";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Select
          value={minuteValue}
          onValueChange={(v) => update({ minutes: v })}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 h-9 px-2 text-sm">
            <SelectValue placeholder="MM">
              {minuteValue ? minuteValue.padStart(2, "0") : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {MINUTE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m.padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select
          value={secondValue}
          onValueChange={(v) => update({ seconds: v })}
          disabled={disabled}
        >
          <SelectTrigger className="w-16 h-9 px-2 text-sm">
            <SelectValue placeholder="SS">{secondValue || null}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {SECOND_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">.</span>
        <Select value={msValue} onValueChange={(v) => update({ ms: v })} disabled={disabled}>
          <SelectTrigger className="w-16 h-9 px-2 text-sm">
            <SelectValue placeholder="ms">{msValue || null}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {MS_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <select
        value={unit}
        disabled={disabled}
        onChange={(e) => update({ unit: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground"
      >
        {unitOptions.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}
