import Image from "next/image";
import Link from "next/link";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  score: ScoreSaberScore;
};

export default function LeaderboardPlayer({ player, score }: Props) {
  const scorePlayer = score.playerInfo;
  const isPlayerWhoSetScore = player && scorePlayer.id === player.id;

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
        <p className={`${isPlayerWhoSetScore && "text-pp"}`}>{scorePlayer.name}</p>
      </Link>
    </div>
  );
}
