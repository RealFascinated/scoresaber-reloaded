import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import { CSSProperties } from "react";
import LeaderboardSongName from "./leaderboard-song-name";

interface ScoreSongInfoProps {
  song: {
    name: string;
    authorName: string;
    art: string;
  };
  level: {
    authorName: string;
    difficulty: MapDifficulty;
  };
  metric?: {
    value: number;
    icon: React.ComponentType<{ className?: string }>;
  };
  beatSaverMap?: BeatSaverMap;
  clickableSongName?: boolean;
  leaderboardId?: number;
  /**
   * Stretch the song name link over its nearest positioned ancestor (e.g. a table row),
   * making the whole row clickable.
   */
  stretchSongNameLink?: boolean;
  imageSize?: number;
  shortDiffNames?: boolean;
  className?: string;
}

export default function ScoreSongInfo({
  song,
  level,
  metric,
  beatSaverMap,
  clickableSongName = true,
  leaderboardId,
  stretchSongNameLink = false,
  shortDiffNames = false,
  imageSize = 64,
  className,
}: ScoreSongInfoProps) {
  const mappersProfile =
    beatSaverMap != undefined ? `https://beatsaver.com/profile/${beatSaverMap.author.id}` : undefined;

  const diff = getDifficulty(level.difficulty);
  const MetricIcon = metric?.icon;

  return (
    <div className="flex w-full items-center gap-4">
      <div
        className="relative flex shrink-0 justify-center"
        style={{
          height: imageSize,
          width: imageSize,
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-md">
          <Image
            src={song.art}
            width={imageSize}
            height={imageSize}
            alt={`${song.name}'s Artwork`}
            className="h-full w-full object-cover"
          />
        </div>
        {/* A dark chip reads on any cover art; the difficulty color lives in the ring and the icon/label. */}
        <div
          className="bg-background/90 text-foreground absolute -right-2 bottom-1 inline-flex h-5.5 w-fit cursor-default items-center gap-1 rounded-md px-1.5 text-xs leading-none font-bold tabular-nums shadow-md ring-[1.5px] ring-(--diff-color) backdrop-blur-sm"
          style={{ "--diff-color": diff.color } as CSSProperties}
        >
          {metric != undefined && metric.value > 0 ? (
            <>
              <span>{metric.value.toFixed(2)}</span>
              {MetricIcon && <MetricIcon className="size-3.5 text-(--diff-color)" />}
            </>
          ) : (
            <span className="text-(--diff-color)">
              {shortDiffNames ? diff.shortName : (diff.displayName ?? diff.mapDifficulty)}
            </span>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-1">
          <LeaderboardSongName
            leaderboardName={song.name}
            leaderboardId={leaderboardId}
            clickableSongName={clickableSongName}
            stretchSongNameLink={stretchSongNameLink}
            className={className}
          />

          <div className="flex flex-row items-end gap-1.5 text-[12.5px] leading-none">
            <p className={cn("text-muted-foreground line-clamp-2", className)}>
              {song.authorName}
              <span className="text-muted-foreground px-1">|</span>
              <span className="text-song-mapper">
                <FallbackLink
                  href={mappersProfile}
                  className={cn(
                    mappersProfile && "hover:text-primary/80 text-xs leading-none transition-colors"
                  )}
                >
                  {level.authorName}
                </FallbackLink>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
