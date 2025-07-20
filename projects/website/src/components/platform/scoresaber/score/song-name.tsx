import SimpleLink from "@/components/simple-link";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export default function ScoreSaberSongName({
  leaderboard,
  clickableSongName,
}: {
  leaderboard: ScoreSaberLeaderboard;
  clickableSongName: boolean;
}) {
  const text = (
    <p className="w-fit overflow-hidden font-semibold whitespace-nowrap">{leaderboard.fullName}</p>
  );
  return clickableSongName ? (
    <SimpleLink
      href={`/leaderboard/${leaderboard.id}`}
      className="text-song-name w-fit min-w-0 cursor-pointer overflow-hidden text-left transition-all hover:brightness-[66%]"
    >
      {text}
    </SimpleLink>
  ) : (
    text
  );
}
