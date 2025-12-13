import { cn } from "@/common/utils";
import { PlayerInfo } from "@/components/player/player-info";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { ReactElement } from "react";
import Card from "../../card";
import CountryFlag from "../../ui/country-flag";

type Variants = {
  [key: string]: {
    icon: (player: ScoreSaberPlayer) => ReactElement<unknown>;
  };
};

const miniVariants: Variants = {
  Global: {
    icon: () => <GlobeAmericasIcon className="size-6" />,
  },
  Country: {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={16} className="rounded-full" />;
    },
  },
};

export default function PlayerMiniRankings({ player }: { player: ScoreSaberPlayer }) {
  const { data: miniRankingResponse } = useQuery({
    queryKey: ["mini-ranking", player.id],
    queryFn: () => ssrApi.getPlayerMiniRanking(player.id),
  });

  return (
    <>
      <PlayerMiniRanking type="Global" player={player} players={miniRankingResponse?.globalRankings ?? []} />
      <PlayerMiniRanking type="Country" player={player} players={miniRankingResponse?.countryRankings ?? []} />
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
    const maxRank = Math.max(...players.map(p => (type === "Global" ? p.rank : p.countryRank) ?? 0));
    const digits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
    const commas = Math.floor((digits - 1) / 3);
    return (digits + commas + 1) * 6.5;
  })();

  return (
    <Card className="sticky flex w-full flex-col gap-(--spacing-md) text-sm select-none sm:w-[400px]">
      {/* Header */}
      <div className="flex h-[24px] items-center gap-2">
        {icon}
        <p className="font-bold">{type} Ranking</p>
      </div>

      {/* Players List */}
      <div className="divide-border bg-accent/50 divide-y rounded-md text-xs">
        {players.length > 0 ? (
          players.map(playerRanking => {
            const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
            const ppDifference = playerRanking.pp - player.pp;

            return (
              <SimpleLink
                key={playerRanking.id}
                href={`/player/${playerRanking.id}`}
                className="group hover:bg-accent/50 sm:px-(--spacing-sm grid cursor-pointer items-center gap-(--spacing-md) px-(--spacing-sm) py-(--spacing-xs) transition-colors duration-200 first:rounded-t-md last:rounded-b-md"
                style={{
                  gridTemplateColumns: isMobile
                    ? `${playerRankWidth}px 48px 1fr auto`
                    : `${playerRankWidth}px 48px 0.69fr 1fr`,
                }}
              >
                {/* Rank */}
                <p className={cn("text-muted-foreground", playerRanking.id === player.id ? "font-bold" : "")}>
                  #{formatNumberWithCommas(rank)}
                </p>

                {/* Player */}
                <div className="flex items-center">
                  <PlayerInfo
                    player={playerRanking}
                    highlightedPlayerId={player.id}
                    hideCountryFlag
                    className="text-xs"
                  />
                </div>

                <div className="m-auto" />

                {/* PP */}
                <div
                  className="grid w-fit items-center gap-(--spacing-sm) md:w-[100px]"
                  style={{
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 0.3fr",
                  }}
                >
                  <p
                    className={cn("text-pp text-right sm:text-left", playerRanking.id === player.id ? "font-bold" : "")}
                  >
                    {formatPp(playerRanking.pp, isMobile ? 1 : 2)}pp
                  </p>
                  {playerRanking.id !== player.id && !isMobile && (
                    <p className={cn("text-xs", ppDifference > 0 ? "text-green-400" : "text-red-400")}>
                      {ppDifference > 0 ? "+" : ""}
                      {formatPp(ppDifference, 2)}
                    </p>
                  )}
                </div>
              </SimpleLink>
            );
          })
        ) : (
          <div className="flex items-center justify-center py-(--spacing-xl)">
            <Spinner />
          </div>
        )}
      </div>
    </Card>
  );
}
