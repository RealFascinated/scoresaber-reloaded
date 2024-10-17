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
import { ScoreSaberPlayersPageToken } from "@ssr/common/types/token/scoresaber/score-saber-players-page-token";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { getPageFromRank } from "@ssr/common/utils/utils";

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
    itemsPerPage: number;
    icon: (player: ScoreSaberPlayer) => ReactElement;
    getPage: (player: ScoreSaberPlayer, itemsPerPage: number) => number;
    getRank: (player: ScoreSaberPlayer) => number;
    query: (page: number, country: string) => Promise<ScoreSaberPlayersPageToken | undefined>;
  };
};

const miniVariants: Variants = {
  Global: {
    itemsPerPage: 50,
    icon: () => <GlobeAmericasIcon className="w-6 h-6" />,
    getPage: (player: ScoreSaberPlayer, itemsPerPage: number) => {
      return getPageFromRank(player.rank - 1, itemsPerPage);
    },
    getRank: (player: ScoreSaberPlayer) => {
      return player.rank;
    },
    query: (page: number) => {
      return scoresaberService.lookupPlayers(page);
    },
  },
  Country: {
    itemsPerPage: 50,
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={12} />;
    },
    getPage: (player: ScoreSaberPlayer, itemsPerPage: number) => {
      return getPageFromRank(player.countryRank - 1, itemsPerPage);
    },
    getRank: (player: ScoreSaberPlayer) => {
      return player.countryRank;
    },
    query: (page: number, country: string) => {
      return scoresaberService.lookupPlayersByCountry(page, country);
    },
  },
};

export default function Mini({ type, player, shouldUpdate }: MiniProps) {
  if (shouldUpdate == undefined) {
    shouldUpdate = true;
  }

  const variant = miniVariants[type];
  const icon = variant.icon(player);
  const itemsPerPage = variant.itemsPerPage;

  // Calculate the page and the rank of the player within that page
  const page = variant.getPage(player, itemsPerPage);
  const rankWithinPage = variant.getRank(player) % itemsPerPage;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mini-ranking-" + type, player.id, type, page],
    queryFn: async () => {
      const pagesToSearch = [page];
      if (rankWithinPage < 5 && page > 1) {
        pagesToSearch.push(page - 1);
      }
      if (rankWithinPage > itemsPerPage - 5) {
        pagesToSearch.push(page + 1);
      }

      const players: ScoreSaberPlayerToken[] = [];
      for (const p of pagesToSearch) {
        const response = await variant.query(p, player.country);
        if (response) {
          players.push(...response.players);
        }
      }

      // Sort players by rank to ensure correct order
      return players.sort((a, b) => {
        // This is the wrong type but it still works.
        return variant.getRank(a as unknown as ScoreSaberPlayer) - variant.getRank(b as unknown as ScoreSaberPlayer);
      });
    },
    enabled: shouldUpdate,
  });

  if (isLoading || !data) {
    return <PlayerRankingSkeleton />;
  }

  if (isError) {
    return <p className="text-red-500">Error loading ranking</p>;
  }

  let players = data;
  const playerPosition = players.findIndex(p => p.id === player.id);

  // Always show 5 players: 3 above and 1 below the player
  const start = Math.max(0, playerPosition - 3);
  const end = Math.min(players.length, start + 5);

  players = players.slice(start, end);

  // If fewer than 5 players, append/prepend more
  if (players.length < 5) {
    const missingPlayers = 5 - players.length;
    if (start === 0) {
      const additionalPlayers = players.slice(playerPosition + 1, playerPosition + 1 + missingPlayers);
      players = [...players, ...additionalPlayers];
    } else if (end === players.length) {
      const additionalPlayers = players.slice(Math.max(0, start - missingPlayers), start);
      players = [...additionalPlayers, ...players];
    }
  }

  return (
    <Card className="w-full flex gap-2 sticky select-none">
      <div className="flex gap-2">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-sm">
        {players.map((playerRanking, index) => {
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
                <Avatar className="w-6 h-6 pointer-events-none">
                  <AvatarImage alt="Profile Picture" src={playerRanking.profilePicture} />
                </Avatar>
                <p className={playerRanking.id === player.id ? "text-pp font-semibold" : ""}>{playerName}</p>
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
