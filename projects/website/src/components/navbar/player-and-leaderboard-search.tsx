"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { LoaderCircle, UserSearch } from "lucide-react";
import { cn } from "@/common/utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useSearch } from "@/components/providers/search-provider";
import { truncateText } from "@/common/string-utils";
import { CommandLoading } from "cmdk";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getScoreSaberLeaderboardFromToken } from "@ssr/common/token-creators";
import { StarIcon } from "@heroicons/react/24/solid";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/leaderboard";
import Avatar from "@/components/avatar";

export default function PlayerAndLeaderboardSearch() {
  const router: AppRouterInstance = useRouter();
  const isMobile = useIsMobile(768);
  const { isOpen, openSearch, closeSearch } = useSearch();

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<{
    players: ScoreSaberPlayerToken[];
    leaderboards: ScoreSaberLeaderboard[];
  }>();
  const debouncedQuery = useDebounce(query, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["playerAndLeaderboardSearch", debouncedQuery],
    queryFn: async (): Promise<{
      players: ScoreSaberPlayerToken[];
      leaderboards: ScoreSaberLeaderboard[];
    }> => {
      if (debouncedQuery.length <= 3 && debouncedQuery.length !== 0) {
        return { players: [], leaderboards: [] };
      }
      const playerResults = await scoresaberService.searchPlayers(debouncedQuery);
      const leaderboardResults = await scoresaberService.searchLeaderboards(query);

      return {
        players:
          playerResults?.players.sort((a, b) => {
            return b.pp - a.pp;
          }) || [],
        leaderboards:
          leaderboardResults?.leaderboards
            .sort((a, b) => {
              const getStatusPriority = (leaderboard: ScoreSaberLeaderboardToken) => {
                if (leaderboard.ranked) return 2; // Highest priority
                if (leaderboard.qualified) return 1; // Medium priority
                return 0; // Lowest priority (unranked)
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
    if (data) {
      setResults(data);
    }
  }, [data]);

  // Listen for CTRL + K keybinds to open this dialog
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

  // Render the contents
  return (
    <>
      {/* Button to open */}
      <div
        className="group flex cursor-pointer hover:opacity-85 transition-all transform-gpu select-none"
        onClick={openSearch}
      >
        <div className={cn("absolute top-1.5 z-10", isMobile ? "inset-x-0 flex justify-center" : "inset-x-2.5")}>
          <UserSearch className="size-5" />
        </div>

        <Input
          className="px-0 pl-9 w-10 md:w-full h-8 rounded-lg cursor-pointer group-hover:border-ssr/75 transition-all transform-gpu"
          type="search"
          name="search"
          placeholder={isMobile ? undefined : "Query..."}
          readOnly
        />

        <div className={cn("hidden absolute top-1.5 right-3", !isMobile && "flex")}>
          <kbd className="h-5 px-1.5 inline-flex gap-1 items-center bg-muted font-medium text-muted-foreground rounded select-none pointer-events-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Dialog */}
      <CommandDialog
        open={isOpen}
        onOpenChange={state => {
          if (state) {
            openSearch();
          } else {
            closeSearch();
          }
        }}
      >
        {/* Input */}
        <div className="relative">
          <CommandInput
            className="select-none"
            placeholder="Enter a player or leaderboard name..."
            maxLength={26}
            value={query}
            onValueChange={setQuery}
          />
          {isLoading && <LoaderCircle className="h-full absolute inset-y-0 right-10 size-5 animate-spin opacity-85" />}
        </div>

        {/* Results */}
        <CommandList className="select-none">
          {isLoading ? (
            <CommandLoading className="py-2 text-center opacity-85">Loading...</CommandLoading>
          ) : (
            <CommandEmpty className="py-2 text-center text-red-500">No results were found.</CommandEmpty>
          )}

          {results && (
            <>
              {/* Player Results */}
              <CommandGroup heading="Player Results">
                {results.players.map(player => {
                  return (
                    <CommandItem
                      key={player.id}
                      value={player.name}
                      className="cursor-pointer flex items-center justify-start"
                      onSelect={() => {
                        closeSearch();
                        router.push(`/player/${player.id}`);
                      }}
                    >
                      <Avatar
                        src={player.profilePicture!}
                        className="w-8 h-8"
                        alt={`${player.name}'s Profile Picture`}
                      />
                      <div className="flex flex-col">
                        <p>{truncateText(player.name, 32)}</p>
                        <p>
                          <span className="text-gray-400">#{formatNumberWithCommas(player.rank)}</span> -{" "}
                          <span className="text-pp">{formatPp(player.pp)}pp</span>
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Leaderboard Results */}
              <CommandGroup heading="Leaderboard Results">
                {results.leaderboards.map(leaderboard => {
                  return (
                    <CommandItem
                      key={leaderboard.id}
                      value={`${leaderboard.songName}-${leaderboard.difficulty.difficulty}-${leaderboard.songHash}`}
                      className="cursor-pointer flex items-center justify-start"
                      onSelect={() => {
                        closeSearch();
                        router.push(`/leaderboard/${leaderboard.id}`);
                      }}
                    >
                      <Avatar src={leaderboard.songArt} className="w-8 h-8" alt={leaderboard.songName} />
                      <div className="flex flex-col">
                        <p>{truncateText(`${leaderboard.songName} ${leaderboard.songSubName}`, 48)}</p>
                        <div className="text-xs">
                          <div className="flex gap-2 items-center">
                            <span
                              style={{
                                color: getDifficulty(leaderboard.difficulty.difficulty).color + "f0", // Transparency value (in hex 0-255)
                              }}
                            >
                              {getDifficultyName(leaderboard.difficulty.difficulty)}
                            </span>{" "}
                            {leaderboard.ranked && (
                              <>
                                -{" "}
                                <div className="flex gap-1 text-pp items-center">
                                  {leaderboard.stars.toFixed(2)}
                                  <StarIcon className="w-fit h-fit" />
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
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
