import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import Link from "next/link";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  clickableSongName: boolean;
};

export default function ScoreSaberSongName({ leaderboard, clickableSongName }: Props) {
  return clickableSongName ? (
    <Link
      prefetch={false}
      href={`/leaderboard/${leaderboard.id}`}
      className="cursor-pointer hover:brightness-[66%] transition-all text-ssr break-all min-w-0 w-fit text-left"
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
