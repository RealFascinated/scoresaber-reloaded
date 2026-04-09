import AddFriend from "@/components/friend/add-friend";
import SimpleLink from "@/components/simple-link";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import Card from "../../card";
import PlayerAccBadges from "./acc-badges";
import ClaimProfile from "./claim-profile";
import PlayerActions from "./player-actions";
import PlayerAvatar from "./player-avatar";
import PlayerOverview from "./player-overview";
import PlayerStats from "./player-stats";
import PlayerStreak from "./player-streak";

type PlayerHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="relative flex flex-col items-center gap-6 text-center select-none lg:flex-row lg:items-start lg:text-start">
        <div className="flex flex-col items-center gap-2">
          <PlayerAvatar player={player} />
          <div className="hidden lg:flex">
            <PlayerStreak player={player} />
          </div>
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-3 lg:items-start lg:justify-start">
          <div className="flex w-full flex-col">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <SimpleLink
                href={`https://steamcommunity.com/profiles/${player.id}`}
                target="_blank"
                className="hover:text-primary/80 max-w-[300px] truncate text-2xl font-semibold transition-colors duration-200"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
              >
                {player.name}
              </SimpleLink>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {player.inactive && (
                  <span className="text-inactive-account rounded-md border border-(--inactive-account)/30 bg-(--inactive-account)/20 px-2.5 py-1 text-xs font-medium">
                    Inactive Account
                  </span>
                )}
                {player.banned && (
                  <span className="bg-destructive/20 text-destructive-foreground border-destructive/30 rounded-md border px-2.5 py-1 text-xs font-medium">
                    Banned Account
                  </span>
                )}
              </div>
              <PlayerOverview player={player} />
            </div>
          </div>

          <PlayerStats player={player} />
          <div className="flex lg:hidden">
            <PlayerStreak player={player} />
          </div>

          <div className="absolute top-0 right-0 flex flex-col gap-2 lg:flex-row">
            <AddFriend player={player} />
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>

      {/* Player Footer */}
      <div className="border-border/50 flex flex-col-reverse items-center gap-4 border-t pt-6 md:flex-row md:justify-between md:pt-4">
        <PlayerActions player={player} />
        <PlayerAccBadges statistics={player.statistics} />
      </div>
    </Card>
  );
}
