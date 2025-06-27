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
import HMDIcon from "../hmd-icon";
import CountryFlag from "../ui/country-flag";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function PlayerHeader({ player }: { player: ScoreSaberPlayer }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar
        src={player.avatar}
        size={96}
        className={cn(
          "pointer-events-none size-20 rounded-xl",
          (player.inactive || player.banned) && "opacity-60"
        )}
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-2">
        <p
          className={cn(
            "block truncate text-xl font-bold transition-all hover:brightness-[66%]",
            (player.inactive || player.banned) && "opacity-60"
          )}
        >
          {player.name}
        </p>

        {/* PP and Medals */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-pp/10 border-pp/20 flex items-center gap-2 rounded-lg border px-2 py-1">
              <div className="bg-pp size-2 rounded-full" />
              <CountUp
                className="text-pp text-sm font-medium"
                end={player.pp}
                duration={1}
                decimals={2}
                formattingFn={value => `${formatPp(value)}pp`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1">
              <div className="size-2 rounded-full bg-yellow-500" />
              <CountUp
                className="text-sm font-medium text-yellow-500"
                end={player.medals}
                duration={1}
                formattingFn={value => `${formatNumberWithCommas(value)} Medals`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerStats({ player }: { player: ScoreSaberPlayer }) {
  // Don't show rank stats for inactive or banned players
  const showRankStats = !player.inactive && !player.banned;

  return (
    <div className="relative">
      {/* Background gradient effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />

      <div className="relative space-y-3 p-3">
        {showRankStats ? (
          <>
            {/* Rank display with visual hierarchy */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-pp/20 absolute inset-0 rounded-full blur-sm" />
                  <GlobeAmericasIcon className="text-pp relative size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">Global</p>
                  <CountUp
                    className="text-lg font-bold"
                    end={player.rank}
                    duration={1}
                    formattingFn={value => `#${formatNumberWithCommas(value)}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-sm" />
                  <CountryFlag code={player.country} size={14} className="relative size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">Country</p>
                  <CountUp
                    className="text-lg font-bold"
                    end={player.countryRank}
                    duration={1}
                    formattingFn={value => `#${formatNumberWithCommas(value)}`}
                  />
                </div>
              </div>
            </div>

            {/* HMD with animated border */}
            {player.hmd && (
              <div className="border-muted-foreground/30 flex items-center justify-center gap-2 rounded-lg border border-dashed p-2">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-green-500/20 blur-sm" />
                  <HMDIcon hmd={getHMDInfo(player.hmd as HMD)} />
                </div>
                <span className="font-medium">{player.hmd}</span>
              </div>
            )}
          </>
        ) : (
          /* Status display for inactive/banned players */
          <div className="space-y-2 text-center">
            <div className="relative inline-block">
              <div className="bg-destructive/20 absolute inset-0 animate-pulse rounded-full blur-md" />
              <div className="bg-destructive relative mx-auto size-4 rounded-full" />
            </div>
            <div>
              <p className="text-destructive font-semibold">
                {player.banned ? "ACCOUNT BANNED" : "ACCOUNT INACTIVE"}
              </p>
              <p className="text-muted-foreground text-xs">
                {player.banned
                  ? "This account has been suspended"
                  : "This account is no longer active"}
              </p>
            </div>
            {player.hmd && (
              <div className="border-muted-foreground/20 flex items-center justify-center gap-2 border-t pt-2">
                <HMDIcon hmd={getHMDInfo(player.hmd as HMD)} />
                <span className="text-muted-foreground text-sm">{player.hmd}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
    enabled: debouncedIsOpen,
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
        className="w-[450px] p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {isLoading || !player ? (
          <div className="flex items-center justify-center p-4">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4 p-4">
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
