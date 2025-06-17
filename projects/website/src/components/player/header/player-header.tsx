import Avatar from "@/components/avatar";
import AddFriend from "@/components/friend/add-friend";
import PlayerTrackedStatus from "@/components/player/player-tracked-status";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import Card from "../../card";
import ClaimProfile from "../claim-profile";
import PlayerOverview from "../player-overview";
import PlayerStats from "../player-stats";
import PlayerAccBadges from "./acc-badges";
import PlayerActions from "./player-actions";

type PlayerHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  return (
    <Card className="flex gap-2">
      <div className="relative flex flex-col items-center gap-3 text-center select-none lg:flex-row lg:items-start lg:text-start">
        <Avatar
          src={player.avatar}
          size={128}
          className="pointer-events-none h-32 w-32"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="flex w-full flex-col items-center justify-center gap-2 lg:items-start lg:justify-start">
          <div>
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <p
                className="text-2xl font-bold"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
              >
                {player.name}
              </p>
              <div className="absolute top-0 left-0 flex flex-col items-center gap-2 lg:relative lg:flex-row">
                <PlayerTrackedStatus player={player} />
              </div>
            </div>
            <div className="flex flex-col">
              <div>
                {player.inactive && <p className="text-gray-400">Inactive Account</p>}
                {player.banned && <p className="text-red-500">Banned Account</p>}
              </div>
              <PlayerOverview player={player} />
            </div>
          </div>

          <PlayerStats player={player} />

          <div className="absolute top-0 right-0 flex flex-col gap-2 lg:flex-row">
            <AddFriend player={player} />
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>

      {/* Player Footer */}
      <div className="flex flex-col-reverse items-center gap-2 md:flex-row md:justify-between">
        <PlayerActions player={player} />
        <PlayerAccBadges badges={player.accBadges} />
      </div>
    </Card>
  );
}
