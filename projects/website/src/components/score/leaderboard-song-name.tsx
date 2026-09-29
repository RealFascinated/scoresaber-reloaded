import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";

export default function LeaderboardSongName({
  leaderboardName,
  leaderboardId,
  clickableSongName,
  stretchSongNameLink,
  className,
}: {
  leaderboardName: string;
  leaderboardId?: number;
  clickableSongName: boolean;
  /**
   * Stretch the link over its nearest positioned ancestor (e.g. a table row), making
   * the whole row clickable. The ancestor must be positioned (`relative`).
   */
  stretchSongNameLink?: boolean;
  className?: string;
}) {
  return clickableSongName && leaderboardId != undefined ? (
    <SimpleLink
      href={`/leaderboard/${leaderboardId}`}
      className={cn(
        "group w-fit cursor-pointer text-left transition-all",
        stretchSongNameLink && "after:absolute after:inset-0"
      )}
    >
      <p
        className={cn(
          "text-song-name group-hover:text-song-name/80 line-clamp-2 w-fit font-semibold transition-all",
          className
        )}
      >
        {leaderboardName}
      </p>
    </SimpleLink>
  ) : (
    <p className={cn("text-song-name line-clamp-2 w-fit font-semibold", className)}>{leaderboardName}</p>
  );
}
