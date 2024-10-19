import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReactElement } from "react";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import { PlayerRankingSkeleton } from "@/components/ranking/player-ranking-skeleton";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getPlayersAroundPlayer } from "@ssr/common/utils/player-utils";
import { AroundPlayer } from "@ssr/common/types/around-player";
import { TablePlayer } from "@/components/table-player";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

const PLAYER_NAME_MAX_LENGTH = 18;

type MiniProps = {
  /**
   * The type of ranking to display.
   */
  type: "Global" | "Country";

  /**
   * The player on this profile.
   */
  player: ScoreSaberPlayer;

  /**
   * Whether the data should be updated
   */
  shouldUpdate?: boolean;
};

type Variants = {
  [key: string]: {
    icon: (player: ScoreSaberPlayer) => ReactElement;
  };
};

const miniVariants: Variants = {
  Global: {
    icon: () => <GlobeAmericasIcon className="w-6 h-6" />,
  },
  Country: {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={12} />;
    },
  },
};

export default function Mini({ type, player, shouldUpdate }: MiniProps) {
  const database = useDatabase();
  const claimedPlayer = useLiveQuery(() => database.getClaimedPlayer());

  if (shouldUpdate == undefined) {
    shouldUpdate = true;
  }

  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mini-ranking-" + type, player.id, type],
    queryFn: () => getPlayersAroundPlayer(player.id, type.toLowerCase() as AroundPlayer),
    enabled: shouldUpdate,
  });

  if (isLoading || !response) {
    return <PlayerRankingSkeleton />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading ranking</p>;
  }

  return (
    <Card className="w-full flex gap-2 sticky select-none">
      <div className="flex gap-2">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-sm">
        {response.players.map((playerRanking, index) => {
          const rank = type == "Global" ? playerRanking.rank : playerRanking.countryRank;
          const playerName =
            playerRanking.name.length > PLAYER_NAME_MAX_LENGTH
              ? playerRanking.name.substring(0, PLAYER_NAME_MAX_LENGTH) + "..."
              : playerRanking.name;
          const ppDifference = playerRanking.pp - player.pp;

          return (
            <Link
              key={index}
              href={`/player/${playerRanking.id}`}
              className="grid gap-2 grid-cols-[auto_1fr_auto] items-center bg-accent px-2 py-1.5 cursor-pointer transform-gpu transition-all hover:brightness-75 first:rounded-t last:rounded-b"
            >
              <p className="text-gray-400">#{formatNumberWithCommas(rank)}</p>
              <div className="flex gap-2 items-center">
                <TablePlayer player={playerRanking} claimedPlayer={claimedPlayer} hideCountryFlag />
              </div>
              <div className="inline-flex min-w-[11.5em] gap-2 items-center">
                <p className="text-pp text-right">{formatPp(playerRanking.pp)}pp</p>
                {playerRanking.id !== player.id && (
                  <p className={`text-xs text-right ${ppDifference > 0 ? "text-green-400" : "text-red-400"}`}>
                    {ppDifference > 0 ? "+" : ""}
                    {formatPp(ppDifference)}
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
