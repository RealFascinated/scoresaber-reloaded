"use client";

import { cn } from "@/common/utils";
import { Spinner } from "@/components/spinner";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { DetailType } from "@ssr/common/detail-type";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import Avatar from "../avatar";
import Card from "../card";
import CountryFlag from "../country-flag";
import HMDIcon from "../hmd-icon";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function PlayerHeader({ player }: { player: ScoreSaberPlayer }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <Avatar
        src={player.avatar}
        size={96}
        className="pointer-events-none size-24 rounded-lg"
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="min-w-0 flex-1">
        <p className="block truncate text-2xl font-bold transition-all hover:brightness-[66%]">
          {player.name}
        </p>

        {/* PP */}
        <div className="text-pp">
          <CountUp
            end={player.pp}
            duration={1}
            decimals={2}
            formattingFn={value => `${formatPp(value)}pp`}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerStats({ player }: { player: ScoreSaberPlayer }) {
  return (
    <Card className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        {/* Global Rank */}
        <div className="grid grid-cols-[24px_1fr] items-center gap-2">
          <div className="flex items-center justify-center">
            <GlobeAmericasIcon className="text-muted-foreground size-5 min-w-5" />
          </div>
          <CountUp
            end={player.rank}
            duration={1}
            formattingFn={value => `#${formatNumberWithCommas(value)}`}
          />
        </div>

        {/* HMD */}
        {player.hmd ? (
          <div className="flex items-center gap-2">
            <p>{player.hmd}</p>
            <HMDIcon hmd={getHMDInfo(player.hmd as HMD)} />
          </div>
        ) : (
          <p className="text-red-400">Unknown HMD</p>
        )}
      </div>

      {/* Country Rank */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-[24px_1fr] items-center gap-2">
          <CountryFlag code={player.country} size={12} className="min-w-5" />
          <CountUp
            end={player.countryRank}
            duration={1}
            formattingFn={value => `#${formatNumberWithCommas(value)}`}
          />
        </div>
      </div>
    </Card>
  );
}

export default function PlayerPreview({
  playerId,
  children,
  className,
  style,
  delay = 100,
  useLink = true,
}: {
  playerId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  useLink?: boolean;
}) {
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
    queryFn: () => ssrApi.getScoreSaberPlayer(playerId, { type: DetailType.BASIC }),
    enabled: isOpen,
  });

  return (
    <Popover open={debouncedIsOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={cn("block w-fit leading-none", className)}
        style={style}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {isLoading || !player ? (
          <div className="flex items-center justify-center p-4">
            <Spinner />
          </div>
        ) : (
          <div className="p-3">
            {/* Player header */}
            {useLink ? (
              <Link
                href={`/player/${player.id}`}
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
              >
                <PlayerHeader player={player} />
              </Link>
            ) : (
              <PlayerHeader player={player} />
            )}

            {/* Player stats */}
            <PlayerStats player={player} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
