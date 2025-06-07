import { PlayerInfo } from "@/components/player/player-info";
import { PlayerRankingSkeleton } from "@/components/ranking/player-ranking-skeleton";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReactElement } from "react";
import Card from "../card";
import CountryFlag from "../country-flag";
import PlayerPreview from "../player/player-preview";

type MiniProps = {
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
    icon: (player: ScoreSaberPlayer) => ReactElement<any>;
  };
};

const miniVariants: Variants = {
  Global: {
    icon: () => <GlobeAmericasIcon className="w-5 h-5" />,
  },
  Country: {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={12} />;
    },
  },
};

export default function Mini({ type, player }: MiniProps) {
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
    return <PlayerRankingSkeleton />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading ranking</p>;
  }

  return (
    <Card className="flex gap-2 sticky select-none text-sm w-[400px]">
      <div className="flex gap-1.5 items-center">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-xs">
        {response.players.map((playerRanking, index) => {
          const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
          const ppDifference = playerRanking.pp - player.pp;

          return (
            <Link
              prefetch={false}
              key={index}
              href={`/player/${playerRanking.id}`}
              className="grid gap-2 grid-cols-[auto_1fr_auto] items-center bg-accent px-2 py-1.5 cursor-pointer transform-gpu transition-all hover:brightness-75 first:rounded-t last:rounded-b"
            >
              <p className="text-gray-400">#{formatNumberWithCommas(rank)}</p>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col items-start">
                  <PlayerPreview playerId={playerRanking.id}>
                    <div className="flex flex-col items-start">
                      <PlayerInfo
                        className="w-[170px] !flex !items-start"
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
                    className={`text-xs text-right ${ppDifference > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {ppDifference > 0 ? "+" : ""}
                    {formatPp(ppDifference, 2)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
