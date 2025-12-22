"use client";

import Avatar from "@/components/avatar";
import PlayerSearchResultItem from "@/components/player/player-search-result-item";
import { useSearch } from "@/components/providers/search-provider";
import SearchDialog from "@/components/ui/search-dialog";
import { StarIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { LoaderCircle, Music, SearchX, Users, UserSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlayerAndLeaderboardSearch() {
  const router = useRouter();
  const { isOpen, openSearch, closeSearch } = useSearch();

  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebounce(query, 200);

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
      const leaderboardResults = await ssrApi.searchLeaderboards(1, {
        search: debouncedQuery,
      });

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
        className="group bg-card border-border hover:border-primary/50 relative flex h-9 w-full cursor-pointer items-center justify-center rounded-xl border px-2 backdrop-blur-sm transition-all duration-200 select-none sm:min-w-16 xl:w-64 xl:justify-start xl:px-(--spacing-sm)"
        onClick={openSearch}
      >
        <UserSearch className="text-muted-foreground size-5" />

        <p className="text-muted-foreground group-hover:text-foreground hidden flex-1 px-(--spacing-sm) text-sm transition-colors duration-200 xl:block">
          Query...
        </p>

        <div className="hidden shrink-0 xl:flex">
          <kbd className="bg-muted/80 text-muted-foreground pointer-events-none inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium shadow-sm select-none">
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
          <div className="flex flex-col items-center justify-center py-12">
            <LoaderCircle className="text-muted-foreground mb-3 size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Searching...</p>
          </div>
        ) : !results?.players.length && !results?.leaderboards.length ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <SearchX className="text-muted-foreground/50 mb-3 size-10" />
            <p className="text-muted-foreground mb-1 text-sm font-medium">No results found</p>
            <p className="text-muted-foreground/70 text-center text-xs">
              {query.length > 0
                ? "Try adjusting your search query"
                : "Start typing to search for players or leaderboards"}
            </p>
          </div>
        ) : (
          <>
            {results.players.length > 0 && (
              <div className="p-2">
                <div className="text-muted-foreground mb-1.5 flex items-center gap-2 px-2 py-2 text-xs font-semibold tracking-wider uppercase">
                  <Users className="size-3.5" />
                  <span>Players</span>
                  <span className="text-muted-foreground/50">({results.players.length})</span>
                </div>
                <div className="space-y-0.5">
                  {results.players.map(player => (
                    <PlayerSearchResultItem
                      key={player.id}
                      player={player}
                      onClick={() => {
                        closeSearch();
                        router.push(`/player/${player.id}`);
                      }}
                      showInactiveLabel
                    />
                  ))}
                </div>
              </div>
            )}

            {results.leaderboards.length > 0 && (
              <div className="p-2">
                <div className="text-muted-foreground mb-1.5 flex items-center gap-2 px-2 py-2 text-xs font-semibold tracking-wider uppercase">
                  <Music className="size-3.5" />
                  <span>Leaderboards</span>
                  <span className="text-muted-foreground/50">({results.leaderboards.length})</span>
                </div>
                <div className="space-y-0.5">
                  {results.leaderboards.map(leaderboard => (
                    <div
                      key={leaderboard.id}
                      className="group hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                      onClick={() => {
                        closeSearch();
                        router.push(`/leaderboard/${leaderboard.id}`);
                      }}
                    >
                      <Avatar
                        src={leaderboard.songArt}
                        className="ring-border group-hover:ring-primary/20 h-9 w-9 shrink-0 ring-2 transition-all duration-200"
                        alt={leaderboard.songName}
                      />
                      <div className="min-w-0 flex-1 flex-col">
                        <p className="group-hover:text-foreground leading-tight font-medium transition-colors duration-200">
                          {truncateText(leaderboard.fullName, 48)}
                        </p>
                        <div className="text-muted-foreground mt-0.5 text-xs leading-tight">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="font-medium"
                              style={{
                                color: getDifficulty(leaderboard.difficulty.difficulty).color + "f0",
                              }}
                            >
                              {getDifficultyName(leaderboard.difficulty.difficulty)}
                            </span>
                            {leaderboard.ranked && (
                              <>
                                <span className="text-muted-foreground/60">·</span>
                                <div className="text-pp flex items-center gap-1">
                                  <span className="font-medium">{leaderboard.stars.toFixed(2)}</span>
                                  <StarIcon className="w-3.5" />
                                </div>
                              </>
                            )}
                            {leaderboard.qualified && (
                              <>
                                <span className="text-muted-foreground/60">·</span>
                                <span className="text-muted-foreground/80">Qualified</span>
                              </>
                            )}
                          </div>
                          <div className="text-muted-foreground/70 mt-0.5">
                            Mapper: {leaderboard.levelAuthorName}
                          </div>
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
