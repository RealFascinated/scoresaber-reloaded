import { PlayerMiniRankingSkeleton } from "@/components/player/mini-ranking/player-mini-ranking-skeleton";
import { PlayerInfo } from "@/components/player/player-info";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReactElement } from "react";
import Card from "../../card";
import CountryFlag from "../../country-flag";
import PlayerPreview from "../player-preview";

type PlayerMiniRankingProps = {
  /**
   * The type of ranking to display.
   */
  type: "Global" | "Country";

  /**
   * The player on this profile.
   */
  player: ScoreSaberPlayer;
};

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

export default function PlayerMiniRanking({ type, player }: PlayerMiniRankingProps) {
  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mini-ranking-" + type, player.id, type],
    queryFn: () => ssrApi.getPlayersAroundPlayer(player.id, type.toLowerCase() as AroundPlayer),
  });

  if (isLoading || !response) {
    return <PlayerMiniRankingSkeleton />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading ranking</p>;
  }

  return (
    <Card className="sticky flex w-[400px] gap-2 text-sm select-none">
      <div className="flex items-center gap-1.5">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-xs">
        {response.players.length > 0 ? (
          response.players.map((playerRanking, index) => {
            const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
            const ppDifference = playerRanking.pp - player.pp;

            return (
              <Link
                key={index}
                href={`/player/${playerRanking.id}`}
                className="bg-accent grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 transition-all first:rounded-t last:rounded-b hover:brightness-75"
              >
                <p className="text-gray-400">#{formatNumberWithCommas(rank)}</p>
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-start">
                    <PlayerPreview playerId={playerRanking.id}>
                      <div className="flex flex-col items-start">
                        <PlayerInfo
                          className="!flex w-[170px] !items-start"
                          player={playerRanking}
                          highlightedPlayerId={player.id}
                          hideCountryFlag
                          hoverBrightness={false}
                        />
                      </div>
                    </PlayerPreview>
                  </div>
                </div>
                <div className="inline-flex min-w-[12.5em] items-center gap-1">
                  <p className="text-ssr text-right">{formatPp(playerRanking.pp)}pp</p>
                  {playerRanking.id !== player.id && (
                    <p
                      className={`text-right text-xs ${ppDifference > 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {ppDifference > 0 ? "+" : ""}
                      {formatPp(ppDifference, 2)}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-gray-400">No players found</p>
        )}
      </div>
    </Card>
  );
}
