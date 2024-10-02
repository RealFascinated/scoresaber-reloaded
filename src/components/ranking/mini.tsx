import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";
import { ScoreSaberPlayersPageToken } from "@/common/model/token/scoresaber/score-saber-players-page-token";
import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ReactElement } from "react";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { PlayerRankingSkeleton } from "@/components/ranking/player-ranking-skeleton";

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
    query: (page: number, country: string) => Promise<ScoreSaberPlayersPageToken | undefined>;
  };
};

const miniVariants: Variants = {
  Global: {
    itemsPerPage: 50,
    icon: () => <GlobeAmericasIcon className="w-6 h-6" />,
    getPage: (player: ScoreSaberPlayer, itemsPerPage: number) => {
      return Math.floor((player.rank - 1) / itemsPerPage) + 1;
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
      return Math.floor((player.countryRank - 1) / itemsPerPage) + 1;
    },
    query: (page: number, country: string) => {
      return scoresaberService.lookupPlayersByCountry(page, country);
    },
  },
};

export default function Mini({ type, player, shouldUpdate }: MiniProps) {
  if (shouldUpdate == undefined) {
    // Default to true
    shouldUpdate = true;
  }
  const variant = miniVariants[type];
  const icon = variant.icon(player);

  const itemsPerPage = variant.itemsPerPage;
  const page = variant.getPage(player, itemsPerPage);
  const rankWithinPage = player.rank % itemsPerPage;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["player-" + type, player.id, type, page],
    queryFn: async () => {
      // Determine pages to search based on player's rank within the page
      const pagesToSearch = [page];
      if (rankWithinPage < 5 && page > 1) {
        // Allow page 1 to be valid
        // Player is near the start of the page, so search the previous page too
        pagesToSearch.push(page - 1);
      }
      if (rankWithinPage > itemsPerPage - 5) {
        // Player is near the end of the page, so search the next page too
        pagesToSearch.push(page + 1);
      }

      // Fetch players from the determined pages
      const players: ScoreSaberPlayerToken[] = [];
      for (const p of pagesToSearch) {
        const response = await variant.query(p, player.country);
        if (response === undefined) {
          return undefined;
        }

        players.push(...response.players);
      }

      return players;
    },
    enabled: shouldUpdate,
  });

  let players = data; // So we can update it later
  if (players && (!isLoading || !isError)) {
    // Find the player's position in the list
    const playerPosition = players.findIndex(p => p.id === player.id);

    // Ensure we always show 5 players
    const start = Math.max(0, playerPosition - 3); // Start showing 3 players above the player, but not less than index 0
    const end = Math.min(players.length, start + 5); // Ensure there are 5 players shown

    players = players.slice(start, end);

    // If there are less than 5 players at the top, append more players from below
    if (players.length < 5 && start === 0) {
      const additionalPlayers = players.slice(playerPosition + 1, playerPosition + (5 - players.length + 1));
      players = [...players, ...additionalPlayers];
    }
  }

  if (isLoading) {
    return <PlayerRankingSkeleton />;
  }

  return (
    <Card className="w-full flex gap-2 sticky select-none">
      <div className="flex gap-2">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col text-sm">
        {isError && <p className="text-red-500">Error</p>}
        {players?.map((playerRanking, index) => {
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
              <div className="inline-flex min-w-[10.75em] gap-2 items-center">
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
