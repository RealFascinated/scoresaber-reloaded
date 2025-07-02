import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Link from "next/link";

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
    <Link
      href={`/leaderboard/${leaderboard.id}`}
      className="text-song-name w-fit min-w-0 cursor-pointer overflow-hidden text-left transition-all hover:brightness-[66%]"
    >
      {text}
    </Link>
  ) : (
    text
  );
}
