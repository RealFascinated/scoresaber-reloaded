import ScoreSaberScore from "@/common/data-fetcher/types/scoresaber/scoresaber-score";
import Image from "next/image";

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
        width={32}
        height={32}
        alt="Song Artwork"
        className="rounded-md min-w-[32px]"
        priority
      />
      <div>
        <p>{player.name}</p>
      </div>
    </div>
  );
}
