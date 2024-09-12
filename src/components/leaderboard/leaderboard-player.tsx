import ScoreSaberScore from "@/common/data-fetcher/types/scoresaber/scoresaber-score";
import Image from "next/image";
import Link from "next/link";

type Props = {
  score: ScoreSaberScore;
};

export default function LeaderboardPlayer({ score }: Props) {
  const player = score.leaderboardPlayerInfo;

  return (
    <div className="flex gap-2">
      <Image
        unoptimized
        src={player.profilePicture}
        width={48}
        height={48}
        alt="Song Artwork"
        className="rounded-md min-w-[48px]"
        priority
      />
      <Link
        href={`/player/${player.id}`}
        target="_blank"
        className="h-fit hover:brightness-75 transition-all transform-gpu"
      >
        <p>{player.name}</p>
      </Link>
    </div>
  );
}
