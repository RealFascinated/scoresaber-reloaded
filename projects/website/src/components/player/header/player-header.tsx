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
      <div className="flex gap-3 flex-col items-center text-center lg:flex-row lg:items-start lg:text-start relative select-none">
        <Avatar
          src={player.avatar}
          size={128}
          className="w-32 h-32 pointer-events-none"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="w-full flex gap-2 flex-col justify-center items-center lg:justify-start lg:items-start">
          <div>
            <div className="flex gap-2 items-center justify-center lg:justify-start">
              <p
                className="font-bold text-2xl"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
              >
                {player.name}
              </p>
              <div className="absolute lg:relative top-0 left-0 flex flex-col lg:flex-row gap-2 items-center">
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

          <div className="absolute top-0 right-0 gap-2 flex flex-col lg:flex-row">
            <AddFriend player={player} />
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>

      {/* Player Footer */}
      <div className="flex flex-col-reverse items-center md:flex-row gap-2 md:justify-between">
        <PlayerActions player={player} />
        <PlayerAccBadges badges={player.accBadges} />
      </div>
    </Card>
  );
}
