import Avatar from "@/components/avatar";
import SearchDialog from "@/components/shared/search-dialog";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
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
    <SearchDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={setQuery}
      isLoading={isLoading}
      placeholder={placeholder}
    >
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
                      <span className="text-gray-400">#{formatNumberWithCommas(player.rank)}</span>{" "}
                      - <span className="text-pp">{formatPp(player.pp)}pp</span>
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </SearchDialog>
  );
};

export default PlayerSearch;
