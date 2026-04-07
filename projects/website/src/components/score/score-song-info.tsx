import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { truncateText } from "@ssr/common/string-utils";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import Image from "next/image";
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
  imageSize?: number;
}

export default function ScoreSongInfo({
  song,
  level,
  metric,
  beatSaverMap,
  clickableSongName = true,
  leaderboardId,
  imageSize = 64,
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
        <div
          className="absolute -right-2 bottom-1 inline-flex h-4.5 w-fit cursor-default items-center justify-end rounded-sm px-1 text-right text-[0.65rem] font-semibold shadow-sm"
          style={{
            backgroundColor: `color-mix(in srgb, ${diff.color} 95%, transparent)`,
          }}
        >
          {metric != undefined && metric.value > 0 ? (
            <div className="flex items-center justify-center gap-1">
              <p>{metric.value.toFixed(2)}</p>
              {MetricIcon && <MetricIcon className="size-[12px]" />}
            </div>
          ) : (
            <p>{diff.shortName}</p>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-col gap-1">
          <LeaderboardSongName
            leaderboardName={song.name}
            leaderboardId={leaderboardId}
            clickableSongName={clickableSongName}
          />

          {/* Author Info */}
          <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
            <p className="line-clamp-2 text-gray-400">
              {truncateText(song.authorName, 32)}
              <span className="px-1 text-gray-500">|</span>
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
