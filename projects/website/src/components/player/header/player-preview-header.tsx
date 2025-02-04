import Avatar from "@/components/avatar";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import Card from "../../card";
import PlayerOverview from "../player-overview";
import Link from "next/link";

type PlayerPreviewHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerPreviewHeader({ player }: PlayerPreviewHeaderProps) {
  return (
    <Card className="flex gap-2">
      <div className="flex gap-6 flex-col items-center text-center lg:flex-row relative select-none">
        <Avatar
          src={player.avatar}
          size={128}
          className="w-32 h-32 pointer-events-none"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="w-full flex gap-2 flex-col justify-center items-center lg:items-start">
          <div>
            <div className="flex gap-2 items-center justify-center lg:justify-start">
              <Link
                prefetch={false}
                href={`/player/${player.id}`}
                className="font-bold text-2xl hover:brightness-[66%] transition-all transform-gpu"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
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
    </Card>
  );
}
