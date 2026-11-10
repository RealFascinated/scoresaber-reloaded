import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { DailyChange } from "@/components/statistic/daily-change";
import CountryFlag from "@/components/ui/country-flag";
import { SharedIcons } from "@/shared-icons";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import type { PpOptions } from "@ssr/common/schemas/overlay/overlay-element";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import Image from "next/image";
import { ReactNode } from "react";
import { PpValue } from "./pp-widget";

function StatRow({
  icon,
  children,
  change,
  type,
}: {
  icon: ReactNode;
  children: ReactNode;
  change: number;
  type: (typeof PlayerStatChange)[keyof typeof PlayerStatChange];
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className="flex items-center gap-3">
        <div className="flex w-8 justify-center">{icon}</div>
        {children}
      </div>
      <DailyChange type={type} change={change} className="text-xl" useTooltip={false} />
    </div>
  );
}

export function PlayerAvatarWidget() {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return (
    <Image
      src={player.avatar}
      alt={`${player.name}'s profile picture`}
      fill
      className="rounded-xl object-cover"
    />
  );
}

export function PlayerNameWidget() {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return <p className="text-4xl font-bold whitespace-nowrap">{player.name}</p>;
}

export function PlayerRankWidget() {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return (
    <StatRow
      icon={<SharedIcons.GlobalRankIcon className="text-foreground/80 size-7" />}
      change={player.daily.rank}
      type={PlayerStatChange.Rank}
    >
      <p className={cn(getRankColor(player.rank), "text-3xl font-bold")}>
        #{formatNumberWithCommas(player.rank)}
      </p>
    </StatRow>
  );
}

export function PlayerCountryRankWidget() {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return (
    <StatRow
      icon={<CountryFlag code={player.country} size={14} />}
      change={player.daily.countryRank}
      type={PlayerStatChange.CountryRank}
    >
      <p className={cn(getRankColor(player.countryRank), "text-3xl font-bold")}>
        #{formatNumberWithCommas(player.countryRank)}
      </p>
    </StatRow>
  );
}

export function PlayerMedalsWidget() {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return (
    <StatRow
      icon={<SharedIcons.OverlayPlayerMedalsIcon className="text-foreground/80 size-7" />}
      change={player.daily.medals}
      type={PlayerStatChange.Medals}
    >
      <p className="text-3xl font-bold">{formatNumberWithCommas(player.medals)}</p>
    </StatRow>
  );
}

export function PlayerPpWidget({ options }: { options: PpOptions }) {
  const { player } = useOverlayRuntime();
  if (!player) {
    return null;
  }
  return <PpValue pp={player.pp} source="SS" showPlatform={options.showPlatform} />;
}

export function PlayerBlPpWidget({ options }: { options: PpOptions }) {
  const { blPlayer } = useOverlayRuntime();
  if (!blPlayer) {
    return null;
  }
  return <PpValue pp={blPlayer.pp} source="BL" showPlatform={options.showPlatform} />;
}
