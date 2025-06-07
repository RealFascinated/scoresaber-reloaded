"use client";

import { LoadingIcon } from "@/components/loading-icon";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { DetailType } from "@ssr/common/detail-type";
import { formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import Link from "next/link";
import { useState } from "react";
import Avatar from "../avatar";
import CountryFlag from "../country-flag";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type PlayerPreviewProps = {
  playerId: string;
  children: React.ReactNode;
};

export default function PlayerPreview({ playerId, children }: PlayerPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const state = useDebounce(isOpen, 100);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-preview", playerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(playerId, { type: DetailType.FULL }),
    enabled: isOpen,
  });

  return (
    <Popover open={state} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="block w-fit leading-none"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {isLoading || !player ? (
          <div className="flex justify-center items-center p-4">
            <LoadingIcon />
          </div>
        ) : (
          <div className="p-3">
            {/* Header with avatar and name */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                src={player.avatar}
                size={64}
                className="w-16 h-16 pointer-events-none rounded-lg"
                alt={`${player.name}'s Profile Picture`}
              />
              <div className="min-w-0 flex-1">
                <Link
                  prefetch={false}
                  href={`/player/${player.id}`}
                  className="block font-bold text-lg hover:brightness-[66%] transition-all transform-gpu truncate"
                  style={{
                    color: getScoreSaberRoles(player)[0]?.color,
                  }}
                >
                  {player.name}
                </Link>
                {(player.inactive || player.banned) && (
                  <p className={`text-sm ${player.banned ? "text-red-500" : "text-gray-400"}`}>
                    {player.banned ? "Banned Account" : "Inactive Account"}
                  </p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {/* Global Rank */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <GlobeAmericasIcon className="h-5 w-5 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Global Rank</p>
                  <p className="truncate">#{player.rank.toLocaleString()}</p>
                </div>
              </div>

              {/* Country Rank */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <CountryFlag code={player.country} size={13} />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Country Rank</p>
                  <p className="truncate">#{player.countryRank.toLocaleString()}</p>
                </div>
              </div>

              {/* PP */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded col-span-2">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-400 text-xs">Performance Points</p>
                  <p className="text-pp truncate">{formatPp(player.pp)}pp</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
