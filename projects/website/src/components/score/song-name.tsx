import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Link from "next/link";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  clickableSongName: boolean;
};

export default function SongName({ leaderboard, clickableSongName }: Props) {
  return clickableSongName ? (
    <Link
      prefetch={false}
      href={`/leaderboard/${leaderboard.id}`}
      className="cursor-pointer hover:brightness-[66%] transform-gpu transition-all text-ssr"
      style={{
        overflowWrap: "anywhere",
      }}
    >
      {leaderboard.fullName}
    </Link>
  ) : (
    <p className="text-ssr break-all min-w-0">{leaderboard.fullName}</p>
  );
}
