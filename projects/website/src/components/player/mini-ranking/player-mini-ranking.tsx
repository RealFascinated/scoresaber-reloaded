import { cn } from "@/common/utils";
import { PlayerMiniRankingSkeleton } from "@/components/player/mini-ranking/player-mini-ranking-skeleton";
import { PlayerInfo } from "@/components/player/player-info";
import SimpleLink from "@/components/simple-link";
import { useIsMobile } from "@/contexts/viewport-context";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { ReactElement } from "react";
import Card from "../../card";
import CountryFlag from "../../ui/country-flag";
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

export default function PlayerMiniRankings({ player }: { player: ScoreSaberPlayer }) {
  const {
    data: miniRankingResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mini-ranking", player.id],
    queryFn: () => ssrApi.getPlayerMiniRanking(player.id),
  });

  if (isLoading || !miniRankingResponse) {
    return (
      <>
        <PlayerMiniRankingSkeleton />
        <PlayerMiniRankingSkeleton />
      </>
    );
  }

  return (
    <>
      <PlayerMiniRanking
        type="Global"
        player={player}
        players={miniRankingResponse.globalRankings}
      />
      <PlayerMiniRanking
        type="Country"
        player={player}
        players={miniRankingResponse.countryRankings}
      />
    </>
  );
}

function PlayerMiniRanking({
  type,
  player,
  players,
}: {
  type: "Global" | "Country";
  player: ScoreSaberPlayer;
  players: ScoreSaberPlayer[];
}) {
  const isMobile = useIsMobile();
  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const playerRankWidth = (() => {
    if (players.length === 0) return 0;

    const maxRank =
      type === "Global"
        ? Math.max(...players.map(player => player.rank ?? 0))
        : Math.max(...players.map(player => player.countryRank ?? 0));

    // Calculate padding based on number of digits
    const rankDigits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
    return rankDigits * 14 + (rankDigits > 1 ? -10 : 0);
  })();

  return (
    <Card className="sticky flex w-full flex-col gap-2 text-xs select-none sm:w-[400px] sm:text-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-medium">{type} Ranking</p>
      </div>

      {/* Players List */}
      <div className="divide-border divide-y">
        {players.length > 0 ? (
          players.map((playerRanking, index) => {
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
                <SimpleLink
                  href={`/player/${playerRanking.id}`}
                  className="group grid cursor-pointer items-center gap-2.5 px-1 py-1.5 sm:px-2"
                  style={{
                    gridTemplateColumns: isMobile
                      ? `${playerRankWidth}px 48px 1fr auto`
                      : `${playerRankWidth}px 48px 0.73fr 1fr`,
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
                      className="text-xs"
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
                    <p className="text-pp text-right font-mono sm:text-left">
                      {formatPp(playerRanking.pp)}pp
                    </p>
                    {playerRanking.id !== player.id && !isMobile && (
                      <p
                        className={cn(
                          "font-mono",
                          ppDifference > 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {ppDifference > 0 ? "+" : ""}
                        {formatPp(ppDifference, 2)}
                      </p>
                    )}
                  </div>
                </SimpleLink>
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
