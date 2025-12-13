import SimpleLink from "@/components/simple-link";

export default function LeaderboardSongName({
  leaderboardName,
  leaderboardId,
  clickableSongName,
}: {
  leaderboardName: string;
  leaderboardId?: number;
  clickableSongName: boolean;
}) {
  return clickableSongName && leaderboardId != undefined ? (
    <SimpleLink
      href={`/leaderboard/${leaderboardId}`}
      className="group w-fit cursor-pointer text-left transition-all"
      data-umami-event="leaderboard-button"
    >
      <p className="text-song-name group-hover:text-song-name/80 line-clamp-2 w-fit font-semibold transition-all">
        {leaderboardName}
      </p>
    </SimpleLink>
  ) : (
    <p className="text-song-name line-clamp-2 w-fit font-semibold">{leaderboardName}</p>
  );
}
