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
      className="text-song-name w-fit min-w-0 cursor-pointer text-left break-all transition-all hover:brightness-[66%]"
      style={{
        overflowWrap: "anywhere",
      }}
    >
      <p>{leaderboard.fullName}</p>
    </Link>
  ) : (
    <p>{leaderboard.fullName}</p>
  );
}
