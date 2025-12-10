import Avatar from "@/components/avatar";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";

type PlayerSearchResultItemProps = {
  player: ScoreSaberPlayer;
  onClick: () => void;
  className?: string;
  showInactiveLabel?: boolean;
};

export default function PlayerSearchResultItem({
  player,
  onClick,
  className,
  showInactiveLabel = false,
}: PlayerSearchResultItemProps) {
  return (
    <div
      className={`group hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:shadow-sm active:scale-[0.98] ${className ?? ""}`}
      onClick={onClick}
    >
      <Avatar
        src={player.avatar}
        className="ring-border group-hover:ring-primary/20 h-9 w-9 shrink-0 ring-2 transition-all duration-200"
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="min-w-0 flex-1 flex-col">
        <p className="group-hover:text-foreground leading-tight font-medium transition-colors duration-200">
          {truncateText(player.name, 32)}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-tight">
          {showInactiveLabel && player.inactive ? (
            <span className="text-inactive-account">Inactive Account</span>
          ) : (
            <span className="text-muted-foreground/80">#{formatNumberWithCommas(player.rank)}</span>
          )}
          {!player.inactive && (
            <>
              {" "}
              <span className="text-muted-foreground/60">·</span>{" "}
              <span className="text-pp font-medium">{formatPp(player.pp)}pp</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
