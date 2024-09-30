import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import Image from "next/image";
import Link from "next/link";

type Props = {
  score: ScoreSaberScoreToken;
};

export default function LeaderboardPlayer({ score }: Props) {
  const player = score.leaderboardPlayerInfo;

  return (
    <div className="flex gap-2">
      <Image
        unoptimized
        src={`https://img.fascinated.cc/upload/w_48,h_48/${player.profilePicture}`}
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
