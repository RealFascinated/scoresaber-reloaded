import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import Image from "next/image";
import Link from "next/link";

type Props = {
  /**
   * The claimed player.
   */
  player: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  score: ScoreSaberScoreToken;
};

export default function LeaderboardPlayer({ player, score }: Props) {
  const scorePlayer = score.leaderboardPlayerInfo;

  return (
    <div className="flex gap-2">
      <Image
        unoptimized
        src={`https://img.fascinated.cc/upload/w_48,h_48/${scorePlayer.profilePicture}`}
        width={48}
        height={48}
        alt="Song Artwork"
        className="rounded-md min-w-[48px]"
        priority
      />
      <Link
        href={`/player/${scorePlayer.id}`}
        target="_blank"
        className="h-fit hover:brightness-75 transition-all transform-gpu"
      >
        <p className={`${scorePlayer.id === player.id && "text-pp"}`}>{scorePlayer.name}</p>
      </Link>
    </div>
  );
}
