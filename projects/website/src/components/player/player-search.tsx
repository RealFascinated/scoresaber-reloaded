import Avatar from "@/components/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

type PlayerSearchProps = {
  /**
   * Whether the search dialog is open.
   */
  isOpen: boolean;
  /**
   * Callback for when the search dialog open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Callback for when a player is selected.
   */
  onPlayerSelect: (player: ScoreSaberPlayer) => void;
  /**
   * Placeholder text for the search input.
   */
  placeholder?: string;
  /**
   * Player IDs to exclude from search results.
   */
  excludePlayerIds?: string[];
};

const PlayerSearch = ({
  isOpen,
  onOpenChange,
  onPlayerSelect,
  placeholder = "Search for a player...",
  excludePlayerIds = [],
}: PlayerSearchProps) => {
  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebounce(query, 500);

  const { data: results, isLoading } = useQuery({
    queryKey: ["player-search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length <= 3 && debouncedQuery.length !== 0) {
        return { players: [] };
      }
      const playerResults = await ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .searchPlayers(debouncedQuery);
      return playerResults || { players: [] };
    },
    refetchInterval: false,
    enabled: isOpen,
  });

  const handlePlayerSelect = async (playerToken: any) => {
    // Convert player token to full player object
    const fullPlayer = await ssrApi.getScoreSaberPlayer(playerToken.id, { type: DetailType.FULL });
    if (fullPlayer) {
      onPlayerSelect(fullPlayer);
      onOpenChange(false);
      setQuery("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search Players</DialogTitle>
        <div className="relative">
          <div className="border-border/50 flex h-12 items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 opacity-50" />
            <input
              className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={placeholder}
              maxLength={26}
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {isLoading && (
              <LoaderCircle className="absolute inset-y-0 right-12 size-5 h-full animate-spin opacity-85" />
            )}
          </div>
        </div>

        <div className="[&::-webkit-scrollbar-thumb]:bg-muted max-h-[400px] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {isLoading ? (
            <div className="text-muted-foreground py-6 text-center text-sm">Loading...</div>
          ) : !results?.players.length ? (
            <div className="py-6 text-center text-sm text-red-500">No results were found.</div>
          ) : (
            <div className="p-2">
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                Player Results
              </div>
              <div className="mt-1 space-y-1">
                {results.players
                  .filter(player => !excludePlayerIds.includes(player.id))
                  .sort((a, b) => a.rank - b.rank)
                  .map(player => (
                    <div
                      key={player.id}
                      className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors"
                      onClick={() => handlePlayerSelect(player)}
                    >
                      <Avatar
                        src={player.profilePicture!}
                        className="h-8 w-8"
                        alt={`${player.name}'s Profile Picture`}
                      />
                      <div className="flex flex-col">
                        <p className="font-medium">{truncateText(player.name, 32)}</p>
                        <p className="text-muted-foreground text-xs">
                          <span className="text-gray-400">
                            #{formatNumberWithCommas(player.rank)}
                          </span>{" "}
                          - <span className="text-pp">{formatPp(player.pp)}pp</span>
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerSearch;
