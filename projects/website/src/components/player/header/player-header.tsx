"use client";

import FollowButton from "@/components/following/follow-button";
import SimpleLink from "@/components/simple-link";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { useState } from "react";
import Card from "../../card";
import PlayerBadges from "../player-badges";
import PlayerAccBadges from "./acc-badges";
import PlayerActions from "./player-actions";
import PlayerAvatar from "./player-avatar";
import PlayerFollows from "./player-follows";
import PlayerNameHistory from "./player-name-history";
import PlayerOverview from "./player-overview";
import PlayerStats, { PlayerStatsSettings } from "./player-stats";
import PlayerStreak from "./player-streak";

type PlayerHeaderProps = {
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  const [editingStats, setEditingStats] = useState(false);

  return (
    <Card className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col items-center gap-4 text-center select-none lg:flex-row lg:items-start lg:gap-6 lg:text-start">
        <div className="flex flex-col items-center gap-2">
          <PlayerAvatar player={player} />
          <div className="hidden lg:flex">
            <PlayerStreak player={player} />
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-3 lg:items-start lg:gap-4">
          <div className="flex w-full flex-col gap-2 lg:gap-3">
            <div className="flex w-full flex-wrap items-center justify-center gap-3 lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 lg:justify-start">
                <h1 className="contents">
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
                </h1>
                <PlayerNameHistory previousNames={player.previousNames ?? []} />
                {player.inactive && (
                  <span className="order-first flex w-full justify-center lg:order-none lg:w-auto">
                    <span className="text-inactive-account rounded-md border border-(--inactive-account)/30 bg-(--inactive-account)/20 px-2 py-0.5 text-xs font-medium">
                      Inactive Account
                    </span>
                  </span>
                )}
                {player.banned && (
                  <span className="bg-destructive/20 text-destructive-foreground border-destructive/30 rounded-md border px-2 py-0.5 text-xs font-medium">
                    Banned Account
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Both are rendered and CSS picks one, as a viewport check in JS shifts the layout on hydration */}
                <FollowButton player={player} iconOnly className="lg:hidden" />
                <FollowButton player={player} className="hidden lg:inline-flex" />
                <PlayerStatsSettings editing={editingStats} onEditingChange={setEditingStats} />
              </div>
            </div>
            <div className="flex justify-center lg:justify-start">
              <PlayerFollows player={player} />
            </div>
            <PlayerOverview player={player} />
          </div>

          <PlayerStats player={player} editing={editingStats} />
          <div className="w-full lg:hidden">
            <PlayerStreak player={player} />
          </div>

          {player.badges.length > 0 && <PlayerBadges player={player} />}
        </div>
      </div>

      <div className="border-border/50 flex flex-col-reverse items-center gap-4 border-t pt-4 md:flex-row md:justify-between">
        <PlayerActions player={player} />
        <PlayerAccBadges statistics={player.statistics} />
      </div>
    </Card>
  );
}
