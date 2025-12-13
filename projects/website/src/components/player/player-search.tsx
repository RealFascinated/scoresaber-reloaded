import SearchDialog from "@/components/ui/search-dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { LoaderCircle, SearchX, Users } from "lucide-react";
import { useState } from "react";
import PlayerSearchResultItem from "./player-search-result-item";

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
      const playerResults = await ssrApi.searchPlayers(debouncedQuery);
      return playerResults || { players: [] };
    },
    refetchInterval: false,
    enabled: isOpen,
  });

  const handlePlayerSelect = (player: ScoreSaberPlayer) => {
    onPlayerSelect(player);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <SearchDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={setQuery}
      isLoading={isLoading}
      placeholder={placeholder}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <LoaderCircle className="text-muted-foreground mb-3 size-6 animate-spin" />
          <p className="text-muted-foreground text-sm">Searching players...</p>
        </div>
      ) : !results?.players.length ? (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <SearchX className="text-muted-foreground/50 mb-3 size-10" />
          <p className="text-muted-foreground mb-1 text-sm font-medium">No players found</p>
          <p className="text-muted-foreground/70 text-center text-xs">
            {query.length > 0 ? "Try adjusting your search query" : "Start typing to search for players"}
          </p>
        </div>
      ) : (
        <div className="p-2">
          <div className="text-muted-foreground mb-1.5 flex items-center gap-2 px-2 py-2 text-xs font-semibold tracking-wider uppercase">
            <Users className="size-3.5" />
            <span>Players</span>
            <span className="text-muted-foreground/50">
              ({results.players.filter(player => !excludePlayerIds.includes(player.id)).length})
            </span>
          </div>
          <div className="space-y-0.5">
            {results.players
              .filter(player => !excludePlayerIds.includes(player.id))
              .sort((a, b) => a.rank - b.rank)
              .map(player => (
                <PlayerSearchResultItem key={player.id} player={player} onClick={() => handlePlayerSelect(player)} />
              ))}
          </div>
        </div>
      )}
    </SearchDialog>
  );
};

export default PlayerSearch;
