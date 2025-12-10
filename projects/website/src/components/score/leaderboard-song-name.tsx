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
  const text = <p className="line-clamp-2 w-fit font-semibold">{leaderboardName}</p>;
  return clickableSongName && leaderboardId != undefined ? (
    <SimpleLink
      href={`/leaderboard/${leaderboardId}`}
      className="text-song-name hover:text-primary/80 w-fit cursor-pointer text-left transition-all"
      data-umami-event="leaderboard-button"
    >
      {text}
    </SimpleLink>
  ) : (
    text
  );
}
