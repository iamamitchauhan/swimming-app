import { useNavigate } from "react-router-dom";
import { Building2, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMyClubs, useSelectClub } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";
import { ROLE_LABEL } from "@/lib/utils";

export function ClubSwitcher() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: clubsData, isLoading } = useMyClubs();
  const selectClubMutation = useSelectClub();

  const clubs = clubsData?.clubs ?? [];
  const currentClubId = user?.clubId;
  const currentClub = clubs.find((c) => c.clubId === currentClubId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clubs.length <= 1) {
    if (currentClub) {
      return (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentClub.clubName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {ROLE_LABEL[currentClub.role] ?? currentClub.role}
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleSelectClub = (clubId: string) => {
    selectClubMutation.mutate(
      { clubId },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal"
        >
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">
              {currentClub?.clubName ?? "Select club"}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {currentClub ? ROLE_LABEL[currentClub.role] ?? currentClub.role : ""}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Club
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clubs.map((club) => (
          <DropdownMenuItem
            key={club.clubId}
            onClick={() => handleSelectClub(club.clubId)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{club.clubName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {ROLE_LABEL[club.role] ?? club.role}
              </p>
            </div>
            {club.clubId === currentClubId && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
