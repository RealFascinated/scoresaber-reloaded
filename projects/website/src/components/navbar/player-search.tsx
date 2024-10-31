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
import { useDebouncedCallback } from "use-debounce";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export default function PlayerSearch() {
  const router: AppRouterInstance = useRouter();

  const [smallScreen, setSmallScreen] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ScoreSaberPlayerToken[] | undefined>();

  useEffect(() => {
    const handleResize = (): void => {
      setSmallScreen(window.innerWidth <= 767);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for CTRL + K keybinds to open this dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setOpen((open: boolean) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle searching for a player
  const searchPlayers = useDebouncedCallback(async (query: string) => {
    setResults(!query ? undefined : (await scoresaberService.searchPlayers(query))?.players);
    setLoading(false);
  }, 500);

  // Render the contents
  return (
    <>
      {/* Button to open */}
      <div
        className="group flex cursor-pointer hover:opacity-85 transition-all transform-gpu select-none"
        onClick={() => setOpen(true)}
      >
        <div className={cn("absolute top-1.5 z-10", smallScreen ? "inset-x-0 flex justify-center" : "inset-x-2.5")}>
          <UserSearch className="size-5" />
        </div>

        <Input
          className="px-0 pl-9 w-10 md:w-full h-8 rounded-lg cursor-pointer group-hover:border-ssr/75 transition-all transform-gpu"
          type="search"
          name="search"
          placeholder={smallScreen ? undefined : "Query..."}
          readOnly
        />

        <div className={cn("hidden absolute top-1.5 right-3", !smallScreen && "flex")}>
          <kbd className="h-5 px-1.5 inline-flex gap-1 items-center bg-muted font-medium text-muted-foreground rounded select-none pointer-events-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* Input */}
        <div className="relative">
          <CommandInput
            className="select-none"
            placeholder="Start typing to find a player..."
            onValueChange={async value => {
              setLoading(true);
              await searchPlayers(value);
            }}
          />
          {loading && <LoaderCircle className="h-full absolute inset-y-0 right-10 size-5 animate-spin opacity-85" />}
        </div>

        {/* Results */}
        <CommandList className="select-none">
          <CommandEmpty className="py-2 text-center text-red-500">No results were found.</CommandEmpty>
          {results && (
            <CommandGroup heading="Results">
              {results.map(player => {
                return (
                  <CommandItem
                    key={player.id}
                    className="cursor-pointer"
                    onSelect={() => {
                      setOpen(false);
                      router.push(`/player/${player.id}`);
                    }}
                  >
                    {player.name}
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
