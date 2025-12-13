import AddFriend from "@/components/friend/add-friend";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import Card from "../../card";
import PlayerAccBadges from "./acc-badges";
import ClaimProfile from "./claim-profile";
import PlayerActions from "./player-actions";
import PlayerAvatar from "./player-avatar";
import PlayerOverview from "./player-overview";
import PlayerStats from "./player-stats";
import Link from "next/link";

type PlayerHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  return (
    <Card className="flex gap-(--spacing-sm)">
      <div className="relative flex flex-col items-center gap-(--spacing-lg) text-center select-none lg:flex-row lg:items-start lg:text-start">
        <PlayerAvatar player={player} />
        <div className="flex w-full flex-col items-center justify-center gap-(--spacing-sm) lg:items-start lg:justify-start">
          <div className="flex flex-col gap-(--spacing-xs)">
            <div className="flex items-center justify-center gap-(--spacing-sm) lg:justify-start">
              <Link
                href={`https://steamcommunity.com/profiles/${player.id}`}
                target="_blank"
                className="max-w-[300px] truncate text-2xl font-semibold hover:text-primary/80 transition-colors duration-200"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
                data-umami-event="player-steam-button"
              >
                {player.name}
              </Link>
            </div>
            <div className="flex flex-col">
              <div>
                {player.inactive && <p className="text-inactive-account">Inactive Account</p>}
                {player.banned && <p className="text-red-500">Banned Account</p>}
              </div>
              <PlayerOverview player={player} />
            </div>
          </div>

          <PlayerStats player={player} />

          <div className="absolute top-0 right-0 flex flex-col gap-(--spacing-sm) lg:flex-row">
            <AddFriend player={player} />
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>

      {/* Player Footer */}
      <div className="flex flex-col-reverse items-center gap-(--spacing-sm) md:flex-row md:justify-between">
        <PlayerActions player={player} />
        <PlayerAccBadges badges={player.accBadges} />
      </div>
    </Card>
  );
}
