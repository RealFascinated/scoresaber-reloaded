import { PlayerMiniRankingSkeleton } from "@/components/player/mini-ranking/player-mini-ranking-skeleton";
import { PlayerInfo } from "@/components/player/player-info";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MiniRankingType } from "@ssr/common/types/around-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReactElement } from "react";
import Card from "../../card";
import CountryFlag from "../../country-flag";
import PlayerPreview from "../player-preview";

type Variants = {
  [key: string]: {
    icon: (player: ScoreSaberPlayer) => ReactElement<unknown>;
  };
};

const miniVariants: Variants = {
  Global: {
    icon: () => <GlobeAmericasIcon className="h-5 w-5" />,
  },
  Country: {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={12} />;
    },
  },
};

export default function PlayerMiniRanking({
  type,
  player,
}: {
  type: "Global" | "Country";
  player: ScoreSaberPlayer;
}) {
  const isMobile = useIsMobile();
  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mini-ranking-" + type, player.id, type],
    queryFn: () => ssrApi.getPlayerMiniRanking(player.id, type.toLowerCase() as MiniRankingType),
  });

  if (isLoading || !response) {
    return <PlayerMiniRankingSkeleton />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading ranking</p>;
  }

  return (
    <Card className="sticky flex w-full flex-col gap-2 text-xs select-none sm:w-[400px] sm:text-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-medium">{type} Ranking</p>
      </div>

      {/* Players List */}
      <div className="divide-border divide-y">
        {response.players.length > 0 ? (
          response.players.map((playerRanking, index) => {
            const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
            const ppDifference = playerRanking.pp - player.pp;

            return (
              <PlayerPreview
                playerId={playerRanking.id}
                delay={750}
                className="w-full transition-all hover:bg-[#2d2d2d]"
                key={playerRanking.id}
                useLink={false}
              >
                <Link
                  href={`/player/${playerRanking.id}`}
                  className="grid cursor-pointer items-center gap-2.5 px-1 py-1.5 sm:px-2"
                  style={{
                    gridTemplateColumns: isMobile ? "auto 48px 1fr auto" : "auto 48px 0.73fr 1fr",
                  }}
                >
                  {/* Rank */}
                  <p className="font-mono text-gray-400">#{formatNumberWithCommas(rank)}</p>

                  {/* Player */}
                  <div className="flex items-center">
                    <PlayerInfo
                      player={playerRanking}
                      highlightedPlayerId={player.id}
                      hideCountryFlag
                      hoverBrightness={false}
                    />
                  </div>

                  <div className="m-auto" />

                  {/* PP */}
                  <div
                    className="grid w-fit items-center gap-2 md:w-[100px]"
                    style={{
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 0.3fr",
                    }}
                  >
                    <p className="text-ssr text-right font-mono sm:text-left">
                      {formatPp(playerRanking.pp)}pp
                    </p>
                    {playerRanking.id !== player.id && !isMobile && (
                      <p
                        className={`font-mono ${ppDifference > 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {ppDifference > 0 ? "+" : ""}
                        {formatPp(ppDifference, 2)}
                      </p>
                    )}
                  </div>
                </Link>
              </PlayerPreview>
            );
          })
        ) : (
          <p className="text-gray-400">No players found</p>
        )}
      </div>
    </Card>
  );
}
