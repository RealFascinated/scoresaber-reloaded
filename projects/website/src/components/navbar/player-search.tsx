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
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useSearch } from "@/components/providers/search-provider";
import { CommandLoading } from "cmdk";

export default function PlayerSearch() {
  const router: AppRouterInstance = useRouter();
  const isMobile = useIsMobile(768);
  const { isOpen, openSearch, closeSearch } = useSearch();

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<ScoreSaberPlayerToken[] | undefined>();
  const debouncedQuery = useDebounce(query, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["playerSearch", debouncedQuery],
    queryFn: async (): Promise<ScoreSaberPlayerToken[] | undefined> => {
      if (debouncedQuery.length <= 3 && debouncedQuery.length !== 0) {
        return [];
      }
      return (
        (await scoresaberService.searchPlayers(debouncedQuery))?.players.sort((a, b) => {
          return b.pp - a.pp;
        }) || []
      );
    },
  });

  useEffect(() => {
    if (data) {
      setResults(data.length > 0 ? data : undefined);
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
            placeholder="Start typing to find a player..."
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
            <CommandGroup heading="Results">
              {results.map(player => {
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
                    <Avatar>
                      <AvatarImage src={player.profilePicture} alt={player.name} />
                    </Avatar>
                    <div className="flex flex-col">
                      <p>{player.name}</p>
                      <p>
                        <span className="text-gray-400">#{formatNumberWithCommas(player.rank)}</span> -{" "}
                        <span className="text-pp">{formatPp(player.pp)}pp</span>
                      </p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
