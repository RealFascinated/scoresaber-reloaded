"use client";

import { PlatformRepository, PlatformType } from "@/common/platform/platform-repository";
import Card from "@/components/card";
import PlayerBadges from "@/components/player/player-badges";
import PlayerViews from "@/components/player/views/player-views";
import { useWindowDimensions } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { DetailType } from "@ssr/common/detail-type";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AccSaberPlayerScores from "../platform/accsaber/accsaber-player-scores";
import ScoreSaberPlayerScores from "../platform/scoresaber/scoresaber-player-scores";
import ScoreSaberPlayerScoresSSR from "../platform/scoresaber/scoresaber-player-scores-ssr";
import { Button } from "../ui/button";
import PlayerHeader from "./header/player-header";
import PlayerMiniRankings from "./mini-ranking/player-mini-ranking";

const platformRepository = PlatformRepository.getInstance();

interface PlayerDataProps {
  player: ScoreSaberPlayer;
  platformType: PlatformType;
}

export default function PlayerData({ platformType, player }: PlayerDataProps) {
  const { width } = useWindowDimensions();
  const database = useDatabase();

  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const isFriend = useStableLiveQuery(() => database.isFriend(player.id));

  const { data: playerData } = useQuery({
    queryKey: ["playerData", player.id, mainPlayerId, isFriend],
    queryFn: () => ssrApi.getScoreSaberPlayer(player.id, DetailType.FULL),
    initialData: player,
  });
  player = playerData ?? player;

  const showRankings = width > 1536 && !player.inactive && !player.banned;

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

  let platform: React.ReactNode;
  switch (platformType) {
    case PlatformType.ScoreSaber:
      platform = <ScoreSaberPlayerScores player={player} />;
      break;
    case PlatformType.MedalScores:
      platform = <ScoreSaberPlayerScoresSSR player={player} mode="medals" />;
      break;
    case PlatformType.AccSaber:
      platform = <AccSaberPlayerScores player={player} />;
      break;
    default:
      platform = <ScoreSaberPlayerScores player={player} />;
  }

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
            <PlayerViews player={player} />
          </Card>
        )}

        {/* Platform Selector and Score Component */}
        <div className="flex flex-col">
          <div className="flex flex-col">
            {/* Platform Selector */}
            <div className="flex">
              {availablePlatforms.map(platform => (
                <Link
                  href={`/player/${player.id}${platform.getType() !== PlatformType.ScoreSaber ? `/${platform.getType()}` : ""}`}
                  key={platform.getDisplayName()}
                  scroll={false}
                >
                  <Button
                    key={platform.getDisplayName()}
                    variant={platformType === platform.getType() ? "default" : "secondary"}
                    className="flex items-center gap-(--spacing-sm) rounded-b-none"
                  >
                    {platform.getLogo()}
                    <span className="hidden md:block">{platform.getDisplayName()}</span>
                  </Button>
                </Link>
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
