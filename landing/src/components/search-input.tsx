import { useRef, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function SearchInput({ value, onChange, placeholder, className = "max-w-lg", debounceMs }: SearchInputProps) {
  const [internal, setInternal] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  function handleChange(raw: string) {
    setInternal(raw);
    if (debounceMs && debounceMs > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onChange(raw), debounceMs);
    } else {
      onChange(raw);
    }
  }

  function handleClear() {
    setInternal("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onChange("");
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={`relative flex-1 ${className ?? ""}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="pl-9 pr-8 h-9"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
      />
      {internal && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
