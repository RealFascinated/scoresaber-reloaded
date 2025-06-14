import Avatar from "@/components/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { CommandLoading } from "cmdk";
import { LoaderCircle } from "lucide-react";
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
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Input */}
      <div className="relative">
        <CommandInput
          className="select-none"
          placeholder={placeholder}
          maxLength={26}
          value={query}
          onValueChange={setQuery}
        />
        {isLoading && (
          <LoaderCircle className="h-full absolute inset-y-0 right-10 size-5 animate-spin opacity-85" />
        )}
      </div>

      {/* Results */}
      <CommandList className="select-none">
        {isLoading ? (
          <CommandLoading className="py-2 text-center opacity-85">Loading...</CommandLoading>
        ) : (
          <CommandEmpty className="py-2 text-center text-red-500">
            No results were found.
          </CommandEmpty>
        )}

        {results && (
          <CommandGroup heading="Player Results">
            {results.players
              .filter(player => !excludePlayerIds.includes(player.id))
              .sort((a, b) => a.rank - b.rank)
              .map(player => (
                <CommandItem
                  key={player.id}
                  value={`${player.name}-${player.id}`}
                  className="cursor-pointer flex items-center justify-start"
                  onSelect={() => handlePlayerSelect(player)}
                >
                  <Avatar
                    src={player.profilePicture!}
                    className="w-8 h-8"
                    alt={`${player.name}'s Profile Picture`}
                  />
                  <div className="flex flex-col">
                    <p>{truncateText(player.name, 32)}</p>
                    <p>
                      <span className="text-gray-400">#{formatNumberWithCommas(player.rank)}</span>{" "}
                      - <span className="text-pp">{formatPp(player.pp)}pp</span>
                    </p>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default PlayerSearch;
