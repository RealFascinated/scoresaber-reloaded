import { leaderboards } from "@/common/leaderboards";
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

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PLAYER_NAME_MAX_LENGTH = 14;

type MiniProps = {
  type: "Global" | "Country";
  player: ScoreSaberPlayer;
};

type Variants = {
  [key: string]: {
    itemsPerPage: number;
    icon: (player: ScoreSaberPlayer) => ReactElement;
    getPage: (player: ScoreSaberPlayer, itemsPerPage: number) => number;
    query: (
      page: number,
      country: string,
    ) => Promise<ScoreSaberPlayersPageToken | undefined>;
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
      return leaderboards.ScoreSaber.queries.lookupGlobalPlayers(page);
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
      return leaderboards.ScoreSaber.queries.lookupGlobalPlayersByCountry(
        page,
        country,
      );
    },
  },
};

export default function Mini({ type, player }: MiniProps) {
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
      if (rankWithinPage < 5 && page > 0) {
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
    refetchInterval: REFRESH_INTERVAL,
  });

  let players = data; // So we can update it later
  if (players && (!isLoading || !isError)) {
    // Find the player's position and show 3 players above and 1 below
    const playerPosition = players.findIndex((p) => p.id === player.id);
    players = players.slice(playerPosition - 3, playerPosition + 2);
  }

  return (
    <Card className="w-full flex gap-2 sticky select-none">
      <div className="flex gap-2">
        {icon}
        <p>{type} Ranking</p>
      </div>
      <div className="flex flex-col">
        {isLoading && <p className="text-gray-400">Loading...</p>}
        {isError && <p className="text-red-500">Error</p>}
        {players?.map((playerRanking, index) => {
          const rank =
            type == "Global" ? playerRanking.rank : playerRanking.countryRank;
          const playerName =
            playerRanking.name.length > PLAYER_NAME_MAX_LENGTH
              ? playerRanking.name.substring(0, PLAYER_NAME_MAX_LENGTH) + "..."
              : playerRanking.name;

          return (
            <Link
              key={index}
              href={`/player/${playerRanking.id}`}
              className="flex justify-between gap-2 bg-accent px-2 py-1.5 cursor-pointer transform-gpu transition-all hover:brightness-75 first:rounded-t last:rounded-b"
            >
              <div className="flex gap-2">
                <p className="text-gray-400">#{formatNumberWithCommas(rank)}</p>
                <Avatar className="w-6 h-6 pointer-events-none">
                  <AvatarImage
                    alt="Profile Picture"
                    src={playerRanking.profilePicture}
                  />
                </Avatar>
                <p
                  className={
                    playerRanking.id === player.id ? "text-gray-400" : ""
                  }
                >
                  {playerName}
                </p>
              </div>
              <p className="text-pp">{formatPp(playerRanking.pp)}pp</p>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
