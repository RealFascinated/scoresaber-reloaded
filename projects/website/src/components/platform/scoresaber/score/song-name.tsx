import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Link from "next/link";

export default function ScoreSaberSongName({
  leaderboard,
  clickableSongName,
}: {
  leaderboard: ScoreSaberLeaderboard;
  clickableSongName: boolean;
}) {
  return clickableSongName ? (
    <Link
      href={`/leaderboard/${leaderboard.id}`}
      className="text-song-name w-full min-w-0 cursor-pointer overflow-hidden text-left transition-all hover:brightness-[66%]"
    >
      <p className="w-full overflow-hidden whitespace-nowrap">{leaderboard.fullName}</p>
    </Link>
  ) : (
    <p className="w-full overflow-hidden whitespace-nowrap">{leaderboard.fullName}</p>
  );
}
