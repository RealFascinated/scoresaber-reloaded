"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import PlayerViews from "@/components/player/views/player-views";
import { useWindowDimensions } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { DetailType } from "@ssr/common/detail-type";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
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

interface PlayerDataProps {
  initialPlayerData: ScoreSaberPlayer;
  platformType: PlatformType;
}

export default function PlayerData({ platformType, initialPlayerData }: PlayerDataProps) {
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

            {/* Platform Scores */}
            <div className="[&>div]:rounded-tl-none">
              {platformType === PlatformType.ScoreSaber ? (
                <ScoreSaberPlayerScores player={player} />
              ) : platformType === PlatformType.MedalScores ? (
                <ScoreSaberPlayerMedalScores player={player} />
              ) : (
                <AccSaberPlayerScores player={player} />
              )}
            </div>
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
