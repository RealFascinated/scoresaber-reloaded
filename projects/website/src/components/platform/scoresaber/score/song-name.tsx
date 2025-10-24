import SimpleLink from "@/components/simple-link";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export default function ScoreSaberSongName({
  leaderboard,
  clickableSongName,
}: {
  leaderboard: ScoreSaberLeaderboard;
  clickableSongName: boolean;
}) {
  const text = <p className="line-clamp-2 w-fit font-semibold">{leaderboard.fullName}</p>;
  return clickableSongName ? (
    <SimpleLink
      href={`/leaderboard/${leaderboard.id}`}
      className="text-song-name w-fit cursor-pointer text-left transition-all hover:brightness-[66%]"
      data-umami-event="leaderboard-button"
    >
      {text}
    </SimpleLink>
  ) : (
    text
  );
}
