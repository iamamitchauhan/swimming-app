import { Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const navigate = useNavigate();
  const dims = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dims} rounded-xl bg-gradient-to-br from-primary to-aqua flex items-center justify-center shadow-sm`}
      >
        <Waves className="h-1/2 w-1/2 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div
        className="flex flex-col leading-tight"
        onClick={() => {
          navigate("/");
        }}
      >
        <span className={`font-bold tracking-tight ${text}`}>Swim Tryouts</span>
        {size !== "sm" && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Club Platform
          </span>
        )}
      </div>
    </div>
  );
}
