"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import { useBreadcrumbTitle } from "@/components/layout/breadcrumb-context";
import PlayerViews from "@/components/player/views/player-views";
import { useQueryParamSelector } from "@/hooks/use-query-param-selector";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringEnum } from "nuqs";
import { useMemo } from "react";
import AccSaberPlayerScores from "../platform/accsaber/accsaber-player-scores";
import PinnedScores from "../platform/scoresaber/pinned-scores";
import type { PlayerLiveScoresInitialData } from "../platform/scoresaber/player-scores-live-query";
import ScoreSaberPlayerScoresLive from "../platform/scoresaber/scoresaber-player-scores-live";
import ScoreSaberPlayerMedalScores from "../platform/scoresaber/scoresaber-player-scores-medals";
import ScoreSaberPlayerScoresSSR from "../platform/scoresaber/scoresaber-player-scores-ssr";
import { ScoresToolbarLeadingProvider } from "../score/scores-toolbar";
import { UnderlineTab, UnderlineTabs } from "../ui/underline-tabs";
import PlayerHeader from "./header/player-header";
import PlayerMiniRankings from "./mini-ranking/player-mini-ranking";
import PlayerReweights from "./reweights/player-reweights";

const platformRepository = PlatformRepository.getInstance();
const PLATFORM_QUERY = parseAsStringEnum<PlatformType>(Object.values(PlatformType)).withDefault(
  PlatformType.ScoreSaber
);

interface PlayerDataProps {
  player: ScoreSaberPlayer;
  /** ScoreSaber scores rendered on the server, used until the client has data of its own. */
  initialScores?: PlayerLiveScoresInitialData;
}

export default function PlayerData({ player: playerProp, initialScores }: PlayerDataProps) {
  const { value: selectedPlatform, setValue: setSelectedPlatform } = useQueryParamSelector({
    param: "platform",
    parser: PLATFORM_QUERY,
    clearOtherParams: true,
    omitParamWhen: v => v === PlatformType.ScoreSaber,
  });

  const { data: playerData } = useQuery({
    queryKey: ["player", playerProp.id],
    queryFn: () => ssrApi.getScoreSaberPlayer(playerProp.id, "full"),
    initialData: playerProp,
    staleTime: 60_000,
    refetchOnMount: false,
  });
  const player = playerData ?? playerProp;
  useBreadcrumbTitle(player.name);

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
        return <ScoreSaberPlayerScoresLive player={player} initialScores={initialScores} />;
      case PlatformType.SSR:
        return <ScoreSaberPlayerScoresSSR player={player} />;
      case PlatformType.MedalScores:
        return <ScoreSaberPlayerMedalScores player={player} />;
      case PlatformType.AccSaber:
        return <AccSaberPlayerScores player={player} />;
    }
  }, [selectedPlatform, player, initialScores]);

  const platformSelector =
    availablePlatforms.length > 1 ? (
      <UnderlineTabs>
        {availablePlatforms.map(platform => (
          <UnderlineTab
            key={platform.getDisplayName()}
            isActive={selectedPlatform === platform.getType()}
            onClick={() => setSelectedPlatform(platform.getType())}
          >
            {platform.getLogo()}
            <span className="hidden sm:block">{platform.getDisplayName()}</span>
          </UnderlineTab>
        ))}
      </UnderlineTabs>
    ) : undefined;

  const showRankings = !player.inactive && !player.banned;
  return (
    <div className="@container w-full">
      <div className="flex w-full flex-col gap-4 @6xl:flex-row @6xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PlayerHeader player={player} />

          {!player.inactive && (
            <div className="ring-border bg-card rounded-xl p-4 ring-1">
              <PlayerViews player={player} key={player.id} />
            </div>
          )}

          <PlayerReweights playerId={player.id} />

          <PinnedScores playerId={player.id} />

          <ScoresToolbarLeadingProvider leading={platformSelector}>{platform}</ScoresToolbarLeadingProvider>
        </div>

        {showRankings && (
          <aside className="hidden w-full shrink-0 @6xl:block @6xl:w-80 @7xl:w-96">
            <PlayerMiniRankings player={player} />
          </aside>
        )}
      </div>
    </div>
  );
}
