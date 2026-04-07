import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";

export default function LeaderboardSongName({
  leaderboardName,
  leaderboardId,
  clickableSongName,
  className,
}: {
  leaderboardName: string;
  leaderboardId?: number;
  clickableSongName: boolean;
  className?: string;
}) {
  return clickableSongName && leaderboardId != undefined ? (
    <SimpleLink
      href={`/leaderboard/${leaderboardId}`}
      className="group w-fit cursor-pointer text-left transition-all"
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
