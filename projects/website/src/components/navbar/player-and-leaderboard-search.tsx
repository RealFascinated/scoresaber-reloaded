"use client";

import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import { useSearch } from "@/components/providers/search-provider";
import { Input } from "@/components/ui/input";
import SearchDialog from "@/components/ui/search-dialog";
import { useIsMobile } from "@/contexts/viewport-context";
import { StarIcon } from "@heroicons/react/24/solid";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlayerAndLeaderboardSearch() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isOpen, openSearch, closeSearch } = useSearch();

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebounce(query, 500);

  const { data: results, isLoading } = useQuery({
    queryKey: ["playerAndLeaderboardSearch", debouncedQuery],
    queryFn: async (): Promise<{
      players: ScoreSaberPlayer[];
      leaderboards: ScoreSaberLeaderboard[];
    }> => {
      if (debouncedQuery.length <= 3 && debouncedQuery.length !== 0) {
        return { players: [], leaderboards: [] };
      }
      const playerResults = await ssrApi.searchPlayers(debouncedQuery);
      const leaderboardResults = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .searchLeaderboards(query);

      return {
        players: playerResults?.players || [],
        leaderboards:
          leaderboardResults?.leaderboards
            .sort((a, b) => {
              const getStatusPriority = (leaderboard: ScoreSaberLeaderboardToken) => {
                if (leaderboard.ranked) return 2;
                if (leaderboard.qualified) return 1;
                return 0;
              };

              const priorityDifference = getStatusPriority(b) - getStatusPriority(a);
              if (priorityDifference !== 0) {
                return priorityDifference;
              }

              return b.stars - a.stars;
            })
            .map(leaderboard => getScoreSaberLeaderboardFromToken(leaderboard)) || [],
      };
    },
    refetchInterval: false,
    enabled: isOpen,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openSearch, closeSearch]);

  return (
    <>
      <div
        className="group relative flex cursor-pointer select-none transition-all duration-200 hover:shadow-md"
        onClick={openSearch}
      >
        <div
          className={cn(
            "absolute top-1/2 z-10 -translate-y-1/2 transition-colors duration-200",
            isMobile ? "inset-x-0 flex justify-center" : "left-3"
          )}
        >
          <UserSearch className="text-muted-foreground group-hover:text-foreground size-5 transition-colors duration-200" />
        </div>

        <Input
          className="group-hover:border-ssr/75 bg-background/50 border-border/50 focus:border-ssr/75 h-9 w-full cursor-pointer rounded-xl px-0 pl-10 backdrop-blur-sm transition-all duration-200 group-hover:shadow-sm"
          type="search"
          name="search"
          placeholder={isMobile ? undefined : "Query..."}
          readOnly
        />

        <div
          className={cn("absolute right-3 top-1/2 hidden -translate-y-1/2", !isMobile && "flex")}
        >
          <kbd className="bg-muted/80 text-muted-foreground border-border/50 pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border px-2 text-xs font-medium shadow-sm">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <SearchDialog
        isOpen={isOpen}
        onOpenChange={closeSearch}
        query={query}
        onQueryChange={setQuery}
        isLoading={isLoading}
        placeholder="Enter a player or leaderboard name..."
      >
        {isLoading ? (
          <div className="text-muted-foreground py-6 text-center text-sm">Loading...</div>
        ) : !results?.players.length && !results?.leaderboards.length ? (
          <div className="py-6 text-center text-sm text-red-500">No results were found.</div>
        ) : (
          <>
            {results.players.length > 0 && (
              <div className="px-2 pt-2.5">
                <div className="text-muted-foreground text-xs font-medium">Player Results</div>
                <div className="mt-1 space-y-1">
                  {results.players.map(player => (
                    <div
                      key={player.id}
                      className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors"
                      onClick={() => {
                        closeSearch();
                        router.push(`/player/${player.id}`);
                      }}
                    >
                      <Avatar
                        src={player.avatar}
                        className="h-8 w-8"
                        alt={`${player.name}'s Profile Picture`}
                      />
                      <div className="flex flex-col">
                        <p className="font-medium">{truncateText(player.name, 32)}</p>
                        <p className="text-muted-foreground text-xs">
                          {player.inactive ? (
                            <span className="text-inactive-account">Inactive Account</span>
                          ) : (
                            <span className="text-gray-400">
                              #{formatNumberWithCommas(player.rank)}
                            </span>
                          )}{" "}
                          - <span className="text-pp">{formatPp(player.pp)}pp</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.leaderboards.length > 0 && (
              <div className="px-2 pt-2.5">
                <div className="text-muted-foreground text-xs font-medium">Leaderboard Results</div>
                <div className="mt-1 space-y-1">
                  {results.leaderboards.map(leaderboard => (
                    <div
                      key={leaderboard.id}
                      className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors"
                      onClick={() => {
                        closeSearch();
                        router.push(`/leaderboard/${leaderboard.id}`);
                      }}
                    >
                      <Avatar
                        src={leaderboard.songArt}
                        className="h-8 w-8"
                        alt={leaderboard.songName}
                      />
                      <div className="flex flex-col">
                        <p className="font-medium">{truncateText(leaderboard.fullName, 48)}</p>
                        <div className="text-muted-foreground text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                color:
                                  getDifficulty(leaderboard.difficulty.difficulty).color + "f0",
                              }}
                            >
                              {getDifficultyName(leaderboard.difficulty.difficulty)}
                            </span>{" "}
                            {leaderboard.ranked && (
                              <>
                                -{" "}
                                <div className="text-pp flex items-center gap-1">
                                  <span>{leaderboard.stars.toFixed(2)}</span>
                                  <StarIcon className="w-4" />
                                </div>
                              </>
                            )}
                            {leaderboard.qualified && (
                              <>
                                - <span className="text-gray-400">Qualified</span>
                              </>
                            )}
                          </div>
                          <div className="text-gray-300">Mapper: {leaderboard.levelAuthorName}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </SearchDialog>
    </>
  );
}
