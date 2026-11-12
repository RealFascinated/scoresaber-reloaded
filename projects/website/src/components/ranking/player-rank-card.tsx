import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import FollowButton from "@/components/following/follow-button";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleLink from "@/components/simple-link";
import CountryFlag from "@/components/ui/country-flag";
import { ReactNode } from "react";

type PlayerRankCardProps = {
  player: { id: string; name: string; avatar: string; country?: string | null };
  rank: number;
  countryRank: number;
  /** The headline number (pp or medals), already formatted. */
  value: ReactNode;
  valueClassName?: string;
  /** Icon shown before the value. */
  valueIcon?: ReactNode;
  /** Small line under the value, e.g. the pp difference to the main player. */
  subValue?: ReactNode;
  inactive?: boolean;
  highlighted?: boolean;
  deferAvatar?: boolean;
  showFollow?: boolean;
};

/**
 * Mobile card for the ranking / medals player lists, used in place of the table row.
 */
export function PlayerRankCard({
  player,
  rank,
  countryRank,
  value,
  valueClassName,
  valueIcon,
  subValue,
  inactive,
  highlighted,
  deferAvatar,
  showFollow,
}: PlayerRankCardProps) {
  return (
    <div
      className={cn(
        "ring-border bg-card relative flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1",
        highlighted && "bg-primary/5",
        inactive && "bg-inactive-account/10"
      )}
    >
      <span className={cn("w-11 shrink-0 text-base font-bold tabular-nums", getRankColor(rank))}>
        #{rank}
      </span>

      <SimpleLink
        href={`/player/${player.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 after:absolute after:inset-0"
      >
        <PlayerAvatar
          profilePicture={player.avatar}
          name={player.name}
          className={inactive ? "grayscale" : ""}
          deferred={deferAvatar}
        />
        <div className="flex min-w-0 flex-col">
          <span className={cn("truncate text-sm font-medium", inactive && "text-muted-foreground")}>
            {player.name}
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
            <CountryFlag code={player.country ?? ""} size={12} />#{countryRank}
          </span>
        </div>
      </SimpleLink>

      <div className="flex shrink-0 flex-col items-end">
        <span className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", valueClassName)}>
          {valueIcon}
          {value}
        </span>
        {subValue}
      </div>

      {showFollow && (
        <div className="relative z-10 shrink-0">
          <FollowButton player={player} iconOnly />
        </div>
      )}
    </div>
  );
}
