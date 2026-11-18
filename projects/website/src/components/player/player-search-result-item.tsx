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
    <button
      type="button"
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 hover:bg-accent hover:shadow-xs active:scale-[0.98] ${className ?? ""}`}
      onClick={onClick}
    >
      <Avatar
        src={player.avatar}
        className="h-9 w-9 shrink-0 ring-2 ring-border transition-all duration-200 group-hover:ring-primary/20"
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="min-w-0 flex-1 flex-col">
        <p className="leading-tight font-medium transition-colors duration-200 group-hover:text-foreground">
          {truncateText(player.name, 32)}
        </p>
        <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
          {showInactiveLabel && player.inactive ? (
            <span className="text-inactive-account">Inactive Account</span>
          ) : (
            <span className="text-muted-foreground/80">#{formatNumberWithCommas(player.rank)}</span>
          )}
          {!player.inactive && (
            <>
              {" "}
              <span className="text-muted-foreground/60">·</span>{" "}
              <span className="font-medium text-pp">{formatPp(player.pp)}pp</span>
            </>
          )}
        </p>
      </div>
    </button>
  );
}
