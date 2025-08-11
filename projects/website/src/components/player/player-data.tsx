"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import PlayerViews from "@/components/player/views/player-views";
import { useWindowDimensions } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import {
  AccSaberScoreOrder,
  AccSaberScoreSort,
  AccSaberScoreType,
} from "@ssr/common/api-service/impl/accsaber";
import { DetailType } from "@ssr/common/detail-type";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { ScoreSaberScoreDataMode } from "@ssr/common/types/score-data-mode";
import { ScoreSort } from "@ssr/common/types/sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import AccSaberPlayerScores from "../platform/accsaber/accsaber-player-scores";
import ScoreSaberPlayerMedalScores from "../platform/scoresaber/scoresaber-player-medal-scores";
import ScoreSaberPlayerScores from "../platform/scoresaber/scoresaber-player-scores";
import SimpleLink from "../simple-link";
import { Button } from "../ui/button";
import PlayerHeader from "./header/player-header";
import PlayerMiniRankings from "./mini-ranking/player-mini-ranking";

const platformRepository = PlatformRepository.getInstance();
function PlatformSelector({
  player,
  currentPlatform,
}: {
  currentPlatform: PlatformType;
  player: ScoreSaberPlayer;
}) {
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
        <SimpleLink
          href={`/player/${player.id}/${platform.getType()}`}
          key={platform.getDisplayName()}
          scroll={false}
        >
          <Button
            key={platform.getDisplayName()}
            variant={currentPlatform === platform.getType() ? "default" : "secondary"}
            className="flex items-center gap-2 rounded-b-none"
          >
            {platform.getLogo()}
            <span className="hidden md:block">{platform.getDisplayName()}</span>
          </Button>
        </SimpleLink>
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
  const mode = (pageParams[2] as ScoreSaberScoreDataMode) ?? ("live" as ScoreSaberScoreDataMode);

  return (
    <div className="[&>div]:rounded-tl-none">
      {platformType === PlatformType.ScoreSaber ? (
        <ScoreSaberPlayerScores
          player={player}
          mode={mode}
          sort={(pageParams[3] as ScoreSaberScoreSort) ?? ("recent" as ScoreSaberScoreSort)}
          direction={
            mode
              ? ((pageParams[mode === "cached" ? 4 : 3] as ScoreSort["direction"]) ??
                ("desc" as ScoreSort["direction"]))
              : undefined
          }
          page={parseInt(pageParams[mode === "cached" ? 5 : 4]) || 1}
          initialSearch={searchParams.search}
        />
      ) : platformType === PlatformType.MedalScores ? (
        <ScoreSaberPlayerMedalScores player={player} page={parseInt(pageParams[2]) || 1} />
      ) : (
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
    queryFn: () =>
      ssrApi.getScoreSaberPlayer(initialPlayerData.id, {
        createIfMissing: true,
        type: DetailType.FULL,
      }),
    initialData: initialPlayerData,
  });

  const player = playerData ?? initialPlayerData;
  const showRankings = width > 1536 && !player.inactive && !player.banned;

  return (
    <div className="flex w-full justify-center gap-2">
      <article className="flex flex-1 flex-col gap-2">
        <PlayerHeader player={player} />

        {/* Player Badges */}
        {player.badges.length > 0 && (
          <Card>
            <PlayerBadges player={player} />
          </Card>
        )}

        {/* Player Views */}
        {!player.inactive && (
          <Card className="flex flex-col gap-2">
            <PlayerViews player={player} />
          </Card>
        )}

        {/* Platform Selector and Score Component */}
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

      {/* Mini Rankings */}
      {showRankings && (
        <aside className="hidden w-[400px] flex-col gap-2 2xl:flex">
          <PlayerMiniRankings player={player} />
        </aside>
      )}
    </div>
  );
}
