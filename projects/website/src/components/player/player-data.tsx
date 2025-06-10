"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import { assert } from "@/common/utils/assert";
import Card from "@/components/card";
import PlayerViews from "@/components/player/history-views/player-views";
import PlayerBadges from "@/components/player/player-badges";
import useDatabase from "@/hooks/use-database";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { Button } from "../ui/button";
import PlayerHeader from "./header/player-header";

const PlayerRankingMini = dynamic(() => import("./player-mini-ranking"), { ssr: false });

interface PlayerDataProps {
  initialPlayerData: ScoreSaberPlayer;
  initialSearch?: string;
  sort: ScoreSaberScoreSort;
  page: number;
  platformType: PlatformType;
}

const platformRepository = PlatformRepository.getInstance();
const scoresaberPlatform = platformRepository.getScoreSaberPlatform();

export default function PlayerData({
  platformType,
  initialPlayerData,
  initialSearch,
  sort,
  page,
}: PlayerDataProps) {
  const platform = PlatformRepository.getInstance().getPlatform(platformType);
  assert(platform, "Platform not found");

  const { width } = useWindowDimensions();
  const database = useDatabase();

  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());
  const isFriend = useLiveQuery(() => database.isFriend(initialPlayerData.id));

  const { data: playerData } = useQuery({
    queryKey: ["playerData", initialPlayerData.id, mainPlayerId, isFriend],
    queryFn: () => scoresaberPlatform.getPlayer(initialPlayerData.id),
    initialData: initialPlayerData,
  });

  const player = playerData ?? initialPlayerData;
  const showRankings = width > 1536 && !player.inactive && !player.banned;

  return (
    <div className="flex gap-2 justify-center w-full">
      <article className="flex flex-1 flex-col gap-2">
        <PlayerHeader player={player} />
        <Card className="gap-1">
          <PlayerBadges player={player} />
          {!player.inactive && <PlayerViews player={player} />}
        </Card>

        {/* Score Platform */}
        <div className="flex flex-col">
          {/* Score Component */}
          <div className="flex flex-col">
            {/* Platform Selector */}
            <div className="flex">
              {PlatformRepository.getInstance()
                .getPlatforms()
                .map((platform, index) => (
                  <Button
                    key={platform.getDisplayName()}
                    variant={platformType === platform.getType() ? "default" : "secondary"}
                    className="flex items-center gap-2 rounded-b-none"
                  >
                    {platform.getLogo()}
                    {platform.getDisplayName()}
                  </Button>
                ))}
            </div>

            {/* Score Component */}
            <div className="[&>div]:rounded-tl-none">
              {platform.render({
                player,
                sort: { sort },
                page,
                initialSearch,
              })}
            </div>
          </div>
        </div>
      </article>

      {showRankings && (
        <aside className="w-[400px] hidden 2xl:flex flex-col gap-2">
          <PlayerRankingMini type="Global" player={player} />
          <PlayerRankingMini type="Country" player={player} />
        </aside>
      )}
    </div>
  );
}
