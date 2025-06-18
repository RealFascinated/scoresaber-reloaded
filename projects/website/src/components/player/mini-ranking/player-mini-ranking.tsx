import { PlayerMiniRankingSkeleton } from "@/components/player/mini-ranking/player-mini-ranking-skeleton";
import { PlayerInfo } from "@/components/player/player-info";
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
    <Card className="sticky flex w-[400px] flex-col gap-2 text-sm select-none">
      <div className="flex items-center gap-1.5 px-2">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-xs">
        {response.players.length > 0 ? (
          response.players.map((playerRanking, index) => {
            const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
            const ppDifference = playerRanking.pp - player.pp;

            return (
              <PlayerPreview
                playerId={playerRanking.id}
                delay={750}
                className="bg-accent w-full transition-all first:rounded-t last:rounded-b hover:brightness-75"
                key={playerRanking.id}
                useLink={false}
              >
                <Link
                  href={`/player/${playerRanking.id}`}
                  className="grid cursor-pointer items-center gap-2.5 px-2 py-1.5"
                  style={{
                    gridTemplateColumns: `auto 48px 0.9fr 1fr`,
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
                  <div className="grid w-[100px] grid-cols-[1fr_0.3fr] items-center gap-2">
                    <p className="text-ssr font-mono">{formatPp(playerRanking.pp)}pp</p>
                    {playerRanking.id !== player.id && (
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
