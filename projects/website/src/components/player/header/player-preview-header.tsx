import Avatar from "@/components/avatar";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import Link from "next/link";
import PlayerOverview from "./player-overview";

type PlayerPreviewHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerPreviewHeader({ player }: PlayerPreviewHeaderProps) {
  return (
    <div className="relative flex flex-col items-center gap-4 text-center select-none lg:flex-row">
      <Avatar
        src={player.avatar}
        size={128}
        className="pointer-events-none h-32 w-32"
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="flex w-full flex-col items-center justify-center gap-2 lg:items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-center gap-2 lg:justify-start">
            <Link
              href={`/player/${player.id}`}
              className="hover:text-primary/80 text-2xl font-bold transition-all"
              style={{
                color: getScoreSaberRoles(player)[0]?.color,
              }}
              data-umami-event="player-button"
            >
              {player.name}
            </Link>
          </div>
          <div className="flex flex-col">
            <PlayerOverview player={player} />
          </div>
        </div>
      </div>
    </div>
  );
}
