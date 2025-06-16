"use client";

import { cn } from "@/common/utils";
import { Spinner } from "@/components/spinner";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { DetailType } from "@ssr/common/detail-type";
import { formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "../avatar";
import CountryFlag from "../country-flag";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type PlayerPreviewProps = {
  playerId: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  useLink?: boolean;
};

export default function PlayerPreview({
  playerId,
  children,
  className,
  delay = 100,
  useLink = true,
}: PlayerPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedIsOpen, setDebouncedIsOpen] = useState(false);

  // Only delay showing, not hiding
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setDebouncedIsOpen(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setDebouncedIsOpen(false);
    }
  }, [isOpen, delay]);

  const { data: player, isLoading } = useQuery({
    queryKey: ["player-preview", playerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(playerId, { type: DetailType.FULL }),
    enabled: isOpen,
  });

  return (
    <Popover open={debouncedIsOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={cn("block w-fit leading-none", className)}
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
            <Spinner />
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
                {useLink ? (
                  <Link
                    href={`/player/${player.id}`}
                    className="block font-bold text-lg hover:brightness-[66%] transition-all truncate"
                    style={{
                      color: getScoreSaberRoles(player)[0]?.color,
                    }}
                  >
                    {player.name}
                  </Link>
                ) : (
                  <p className="block font-bold text-lg hover:brightness-[66%] transition-all truncate">
                    {player.name}
                  </p>
                )}
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
