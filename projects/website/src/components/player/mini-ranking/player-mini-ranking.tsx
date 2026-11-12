import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { useIsMobile } from "@/contexts/viewport-context";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ReactElement, ReactNode } from "react";
import Card from "../../card";
import CountryFlag from "../../ui/country-flag";
import { miniRankingQueryKey } from "./mini-ranking-query";

type Variants = {
  [key: string]: {
    icon: (player: ScoreSaberPlayer) => ReactElement;
  };
};

const miniVariants: Variants = {
  Global: {
    icon: () => <SharedIcons.GlobalRankIcon className="size-6" />,
  },
  Country: {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={16} className="rounded-full" />;
    },
  },
};

export default function PlayerMiniRankings({
  player,
  children,
}: {
  player: ScoreSaberPlayer;
  /** Extra content shown below the rankings, sticking with them. */
  children?: ReactNode;
}) {
  const {
    data: miniRankingResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: miniRankingQueryKey(player.id),
    queryFn: () => ssrApi.getPlayerMiniRanking(player.id),
  });

  return (
    <div className="sticky top-16 flex flex-col gap-4">
      <PlayerMiniRanking
        type="Global"
        player={player}
        players={miniRankingResponse?.globalRankings ?? []}
        isLoading={isLoading}
        isError={isError}
      />
      <PlayerMiniRanking
        type="Country"
        player={player}
        players={miniRankingResponse?.countryRankings ?? []}
        isLoading={isLoading}
        isError={isError}
      />
      {children}
    </div>
  );
}

function PlayerMiniRanking({
  type,
  player,
  players,
  isLoading,
  isError,
}: {
  type: keyof Variants;
  player: ScoreSaberPlayer;
  players: ScoreSaberPlayer[];
  isLoading: boolean;
  isError: boolean;
}) {
  const isMobile = useIsMobile();
  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const playerRankWidth = (() => {
    if (players.length === 0) {
      return 0;
    }
    const maxRank = Math.max(...players.map(p => (type === "Global" ? p.rank : p.countryRank) ?? 0));
    const digits = maxRank > 0 ? Math.floor(Math.log10(maxRank)) + 1 : 0;
    const commas = Math.floor((digits - 1) / 3);
    return (digits + commas + 1) * 6.5;
  })();

  const deltaChars = (() => {
    const lengths = players
      .filter(p => p.id !== player.id)
      .map(p => {
        const diff = p.pp - player.pp;
        return `${diff > 0 ? "+" : ""}${formatPp(diff, 2)}`.length;
      });
    return lengths.length > 0 ? Math.max(...lengths) : 0;
  })();

  return (
    <Card className="flex w-full flex-col gap-2 p-3 text-xs select-none">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-bold">{type} Ranking</p>
      </div>

      <div className="divide-border bg-accent/50 divide-y rounded-md">
        {players.length > 0 ? (
          players.map(playerRanking => {
            const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
            const ppDifference = playerRanking.pp - player.pp;

            return (
              <SimpleLink
                key={playerRanking.id}
                href={`/player/${playerRanking.id}`}
                className="group hover:bg-accent/50 grid cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors duration-200 first:rounded-t-md last:rounded-b-md"
                style={{
                  gridTemplateColumns: isMobile
                    ? `${playerRankWidth}px minmax(0,1fr) auto`
                    : `${playerRankWidth}px minmax(0,1fr) auto`,
                }}
              >
                <p className={cn("text-muted-foreground", playerRanking.id === player.id ? "font-bold" : "")}>
                  #{formatNumberWithCommas(rank)}
                </p>

                <div className="flex min-w-0 items-center gap-2">
                  <Avatar
                    src={playerRanking.avatar}
                    size={26}
                    alt={`${playerRanking.name}'s Profile Picture`}
                  />

                  <p
                    className={clsx(
                      playerRanking.id == player.id ? "font-bold" : "",
                      "min-w-0 flex-1 truncate text-left transition-all duration-200"
                    )}
                    style={{
                      color: getScoreSaberRoles(playerRanking)[0]?.color,
                    }}
                  >
                    {playerRanking.name}
                  </p>
                </div>

                <div
                  className="grid w-fit items-center gap-1.5"
                  style={{
                    gridTemplateColumns: isMobile ? "1fr" : "auto auto",
                  }}
                >
                  <p
                    className={cn(
                      "text-pp text-right tabular-nums sm:text-left",
                      playerRanking.id === player.id ? "font-bold" : ""
                    )}
                  >
                    {formatPp(playerRanking.pp, isMobile ? 1 : 2)}pp
                  </p>
                  {!isMobile &&
                    (playerRanking.id !== player.id ? (
                      <p
                        className={cn(
                          "text-left tabular-nums",
                          ppDifference > 0 ? "text-success" : "text-danger"
                        )}
                        style={{ width: `${deltaChars}ch` }}
                      >
                        {ppDifference > 0 ? "+" : ""}
                        {formatPp(ppDifference, 2)}
                      </p>
                    ) : (
                      <span aria-hidden style={{ width: `${deltaChars}ch` }} />
                    ))}
                </div>
              </SimpleLink>
            );
          })
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner />
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-muted-foreground text-sm">Failed to load rankings</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <p className="text-muted-foreground text-sm">No rankings found</p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
