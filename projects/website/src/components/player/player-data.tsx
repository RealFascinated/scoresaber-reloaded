"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
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
import ScoreSaberPlayerScoresLive from "../platform/scoresaber/scoresaber-player-scores-live";
import ScoreSaberPlayerMedalScores from "../platform/scoresaber/scoresaber-player-scores-medals";
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
  const isMobile = useIsMobile("md");

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
    staleTime: 60_000,
    refetchOnMount: false,
  });
  player = playerData ?? player;

  const { data: availablePlatforms = [] } = useQuery({
    queryKey: ["available-platforms", player.id],
    queryFn: async () => {
      const platforms = platformRepository.getPlatforms();
      const available = await Promise.all(
        platforms.map(async p => {
          try {
            return {
              platform: p,
              available: await p.getOptions().displayPredicate(player),
            };
          } catch {
            return { platform: p, available: false };
          }
        })
      );
      return available.filter(p => p.available).map(p => p.platform);
    },
    placeholderData: data => data,
  });

  const platform = useMemo(() => {
    switch (selectedPlatform) {
      case PlatformType.ScoreSaber:
        return <ScoreSaberPlayerScoresLive player={player} />;
      case PlatformType.SSR:
        return <ScoreSaberPlayerScoresSSR player={player} />;
      case PlatformType.MedalScores:
        return <ScoreSaberPlayerMedalScores player={player} />;
      case PlatformType.AccSaber:
        return <AccSaberPlayerScores player={player} />;
    }
  }, [selectedPlatform, player]);

  const showRankings = !isMobile && !player.inactive && !player.banned;
  return (
    <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <PlayerHeader player={player} />

        {player.badges.length > 0 && (
          <div className="ring-border bg-card rounded-xl p-4 ring-1">
            <PlayerBadges player={player} />
          </div>
        )}

        {!player.inactive && (
          <div className="ring-border bg-card rounded-xl p-4 ring-1">
            <PlayerViews player={player} key={player.id} />
          </div>
        )}

        <div className="flex flex-col">
          <div className="flex">
            {availablePlatforms.map(platform => (
              <Button
                key={platform.getDisplayName()}
                variant={selectedPlatform === platform.getType() ? "default" : "secondary"}
                className="flex items-center gap-2 rounded-b-none"
                onClick={() => setSelectedPlatform(platform.getType())}
              >
                {platform.getLogo()}
                <span className="hidden md:block">{platform.getDisplayName()}</span>
              </Button>
            ))}
          </div>
          <div className="[&>div]:rounded-tl-none">{platform}</div>
        </div>
      </div>

      {showRankings && (
        <aside className="w-full shrink-0 md:w-96">
          <PlayerMiniRankings player={player} />
        </aside>
      )}
    </div>
  );
}
