import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { cn } from "@/common/utils";
import { SharedIcons } from "@/shared-icons";
import type { SongInfoOptions } from "@ssr/common/schemas/overlay/overlay-element";
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
        "inline-flex h-8 items-center rounded-full bg-white/[0.07] px-3.5 text-lg leading-none font-medium whitespace-nowrap ring-1 ring-white/10 ring-inset tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SongInfoWidget({ options }: { options: SongInfoOptions }) {
  const { data } = useOverlayRuntime();
  const map = data.map?.beatSaverMap;
  if (!map) {
    return null;
  }

  const difficulty = getDifficulty(map.difficulty.difficulty);
  const leaderboard = data.map?.leaderboard;
  const showSongName = options.showSongName ?? true;
  const showSongAuthor = options.showSongAuthor ?? true;
  const showMapper = options.showMapper ?? false;
  const showDifficulty = options.showDifficulty ?? true;
  const showStars = options.showStars ?? true;
  const showBpm = options.showBpm ?? true;
  const showBsr = options.showBsr ?? true;
  const hasText = showSongName || (showSongAuthor && !!map.metadata.songAuthorName) || showMapper;
  const hasChips =
    showDifficulty || (showStars && !!leaderboard && leaderboard.stars > 0) || showBpm || showBsr;

  return (
    <div className={cn("flex flex-col gap-4 transition-all", data.paused && "grayscale")}>
      {hasText && (
        <div className="flex flex-col">
          {showSongName && (
            <p className="text-4xl leading-tight font-extrabold tracking-tight whitespace-nowrap">
              {map.metadata.songName}
            </p>
          )}
          {showSongAuthor && map.metadata.songAuthorName && (
            <p className="mt-1 text-xl leading-tight font-medium whitespace-nowrap text-foreground/70">
              {map.metadata.songAuthorName}
            </p>
          )}
          {showMapper && (
            <p className="mt-2 text-sm font-medium whitespace-nowrap text-foreground/45">
              Mapped by {truncateText(map.metadata.levelAuthorName, 48)}
            </p>
          )}
        </div>
      )}
      {hasChips && (
        <div className="flex items-center gap-2.5">
          {showDifficulty && (
            <span
              className="inline-flex h-8 items-center rounded-full px-4 text-lg leading-none font-semibold whitespace-nowrap"
              style={{ backgroundColor: difficulty.color, color: "var(--difficulty-foreground)" }}
            >
              {getDifficultyName(difficulty)}
            </span>
          )}
          {showStars && leaderboard && leaderboard.stars > 0 && (
            <Chip className="gap-1.5 bg-yellow-400/10 text-yellow-300 ring-yellow-300/20">
              {leaderboard.stars}
              <SharedIcons.DifficultyStarIcon className="size-4" />
            </Chip>
          )}
          {showBpm && (
            <Chip>
              {formatNumberWithCommas(map.metadata.bpm)}
              <span className="ml-1 text-sm text-foreground/50">BPM</span>
            </Chip>
          )}
          {showBsr && (
            <Chip className="gap-1.5">
              <span className="text-foreground/45">!bsr</span>
              <span className="font-mono text-base">{map.bsr}</span>
            </Chip>
          )}
        </div>
      )}
    </div>
  );
}
