"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import Card from "@/components/card";
import PlayerViews from "@/components/player/history-views/player-views";
import PlayerBadges from "@/components/player/player-badges";
import useDatabase from "@/hooks/use-database";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import {
  AccSaberScoreOrder,
  AccSaberScoreSort,
  AccSaberScoreType,
} from "@ssr/common/api-service/impl/accsaber";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import AccSaberPlayerScores from "../platform/accsaber/accsaber-player-scores";
import ScoreSaberPlayerScores from "../platform/scoresaber/scoresaber-player-scores";
import { Button } from "../ui/button";
import PlayerHeader from "./header/player-header";

const PlayerRankingMini = dynamic(() => import("./player-mini-ranking"), { ssr: false });

const platformRepository = PlatformRepository.getInstance();
const scoresaberPlatform = platformRepository.getScoreSaberPlatform();

function PlatformSelector({
  player,
  currentPlatform,
}: {
  currentPlatform: PlatformType;
  player: ScoreSaberPlayer;
}) {
  const router = useRouter();

  const { data: availablePlatforms = [] } = useQuery({
    queryKey: ["available-platforms", player.id],
    queryFn: async () => {
      const platforms = platformRepository.getPlatforms();
      const available = await Promise.all(
        platforms.map(async p => ({
          platform: p,
          available: await p.getOptions().displayPredicate(player.id),
        }))
      );
      return available.filter(p => p.available).map(p => p.platform);
    },
    enabled: true,
  });

  return (
    <div className="flex">
      {availablePlatforms.map(platform => (
        <Button
          key={platform.getDisplayName()}
          variant={currentPlatform === platform.getType() ? "default" : "secondary"}
          className="flex items-center gap-2 rounded-b-none"
          onClick={() =>
            router.push(`/player/${player.id}/${platform.getType()}`, {
              scroll: false,
            })
          }
        >
          {platform.getLogo()}
          {platform.getDisplayName()}
        </Button>
      ))}
    </div>
  );
}

function ScoreComponent({
  platformType,
  player,
  searchParams,
  pageParams,
}: {
  platformType: PlatformType;
  player: ScoreSaberPlayer;
  searchParams: {
    [key: string]: string | undefined;
  };
  pageParams: string[];
}) {
  return (
    <div className="[&>div]:rounded-tl-none">
      {platformType === PlatformType.ScoreSaber ? (
        <ScoreSaberPlayerScores
          player={player}
          sort={(pageParams[2] as ScoreSaberScoreSort) ?? ("recent" as ScoreSaberScoreSort)}
          page={parseInt(pageParams[3]) || 1}
          initialSearch={searchParams.search}
        />
      ) : (
        // return `/player/${player.id}/accsaber/${currentSort}/${currentType}/${currentOrder}/${page}`;
        <AccSaberPlayerScores
          player={player}
          sort={(pageParams[2] as AccSaberScoreSort) ?? ("date" as AccSaberScoreSort)}
          type={(pageParams[3] as AccSaberScoreType) ?? ("overall" as AccSaberScoreType)}
          order={(pageParams[4] as AccSaberScoreOrder) ?? ("desc" as AccSaberScoreOrder)}
          page={parseInt(pageParams[5]) || 1}
        />
      )}
    </div>
  );
}

interface PlayerDataProps {
  initialPlayerData: ScoreSaberPlayer;
  platformType: PlatformType;
  searchParams: {
    [key: string]: string | undefined;
  };
  pageParams: string[];
}

export default function PlayerData({
  platformType,
  initialPlayerData,
  pageParams,
  searchParams,
}: PlayerDataProps) {
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

        <div className="flex flex-col">
          <div className="flex flex-col">
            <PlatformSelector currentPlatform={platformType} player={player} />
            <ScoreComponent
              platformType={platformType}
              player={player}
              searchParams={searchParams}
              pageParams={pageParams}
            />
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
