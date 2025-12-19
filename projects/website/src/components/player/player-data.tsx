"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import PlayerViews from "@/components/player/views/player-views";
import { useIsMobile } from "@/contexts/viewport-context";
import { useQueryParamSelector } from "@/hooks/use-query-param-selector";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringEnum } from "nuqs";
import { useMemo } from "react";
import AccSaberPlayerScores from "../platform/accsaber/accsaber-player-scores";
import ScoreSaberPlayerScores from "../platform/scoresaber/scoresaber-player-scores";
import ScoreSaberPlayerScoresSSR from "../platform/scoresaber/scoresaber-player-scores-ssr";
import { Button } from "../ui/button";
import PlayerHeader from "./header/player-header";
import PlayerMiniRankings from "./mini-ranking/player-mini-ranking";

const platformRepository = PlatformRepository.getInstance();
const PLATFORM_QUERY = parseAsStringEnum<PlatformType>(Object.values(PlatformType)).withDefault(
  PlatformType.ScoreSaber
);

interface PlayerDataProps {
  player: ScoreSaberPlayer;
}

export default function PlayerData({ player }: PlayerDataProps) {
  const isMobile = useIsMobile("2xl");

  const { value: selectedPlatform, setValue: setSelectedPlatform } = useQueryParamSelector({
    param: "platform",
    parser: PLATFORM_QUERY,
    clearOtherParams: true,
    omitParamWhen: v => v === PlatformType.ScoreSaber,
  });

  const { data: playerData } = useQuery({
    queryKey: ["player", player.id],
    queryFn: () => ssrApi.getScoreSaberPlayer(player.id, "full"),
    initialData: player,
  });
  player = playerData ?? player;

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
  });

  const platform = useMemo(() => {
    switch (selectedPlatform) {
      case PlatformType.ScoreSaber:
        return <ScoreSaberPlayerScores player={player} />;
      case PlatformType.MedalScores:
        return <ScoreSaberPlayerScoresSSR player={player} mode="medals" />;
      case PlatformType.AccSaber:
        return <AccSaberPlayerScores player={player} />;
    }
  }, [selectedPlatform, player]);

  const showRankings = !isMobile && !player.inactive && !player.banned;
  return (
    <div className="flex w-full justify-center gap-(--spacing-sm)">
      <article className="flex w-full flex-1 flex-col gap-(--spacing-sm)">
        <PlayerHeader player={player} />

        {/* Player Badges */}
        {player.badges.length > 0 && (
          <Card>
            <PlayerBadges player={player} />
          </Card>
        )}

        {/* Player Views */}
        {!player.inactive && (
          <Card>
            <PlayerViews player={player} key={player.id} />
          </Card>
        )}

        {/* Platform Selector and Score Component */}
        <div className="flex flex-col">
          <div className="flex flex-col">
            {/* Platform Selector */}
            <div className="flex">
              {availablePlatforms.map(platform => (
                <Button
                  key={platform.getDisplayName()}
                  variant={selectedPlatform === platform.getType() ? "default" : "secondary"}
                  className="flex items-center gap-(--spacing-sm) rounded-b-none"
                  onClick={() => setSelectedPlatform(platform.getType())}
                >
                  {platform.getLogo()}
                  <span className="hidden md:block">{platform.getDisplayName()}</span>
                </Button>
              ))}
            </div>
            {/* Score Component */}
            <div className="[&>div]:rounded-tl-none">{platform}</div>
          </div>
        </div>
      </article>

      {/* Mini Rankings */}
      {showRankings && (
        <aside className="hidden w-[400px] flex-col gap-(--spacing-sm) 2xl:flex">
          <PlayerMiniRankings player={player} />
        </aside>
      )}
    </div>
  );
}
