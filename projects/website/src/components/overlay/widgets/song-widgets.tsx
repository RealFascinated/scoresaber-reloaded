import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { cn } from "@/common/utils";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import { ReactNode } from "react";

export function SongCoverWidget() {
  const { data } = useOverlayRuntime();
  const map = data.map?.beatSaverMap;
  if (!map) {
    return null;
  }
  return (
    <Image
      src={map.songArt}
      alt={map.name}
      fill
      className={cn("rounded-xl object-cover shadow-lg transition-all", data.paused && "grayscale")}
    />
  );
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-white/10 px-3 py-1 text-lg leading-none font-medium whitespace-nowrap tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SongInfoWidget() {
  const { data } = useOverlayRuntime();
  const map = data.map?.beatSaverMap;
  if (!map) {
    return null;
  }

  const difficulty = getDifficulty(map.difficulty.difficulty);
  const leaderboard = data.map?.leaderboard;

  return (
    <div className={cn("flex flex-col gap-3 transition-all", data.paused && "grayscale")}>
      <div className="flex flex-col gap-0.5">
        <p className="text-4xl leading-tight font-extrabold whitespace-nowrap">{map.metadata.songName}</p>
        {map.metadata.songAuthorName && (
          <p className="text-muted-foreground text-xl whitespace-nowrap">{map.metadata.songAuthorName}</p>
        )}
        <p className="text-muted-foreground/70 text-base whitespace-nowrap">
          Mapped by {truncateText(map.metadata.levelAuthorName, 48)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-3.5 py-1 text-lg leading-none font-semibold whitespace-nowrap"
          style={{ backgroundColor: difficulty.color, color: "var(--difficulty-foreground)" }}
        >
          {getDifficultyName(difficulty)}
        </span>
        {leaderboard && leaderboard.stars > 0 && (
          <Chip className="text-yellow-300">{leaderboard.stars} ★</Chip>
        )}
        <Chip>{formatNumberWithCommas(map.metadata.bpm)} BPM</Chip>
        <Chip className="font-mono text-base">!bsr {map.bsr}</Chip>
      </div>
    </div>
  );
}
