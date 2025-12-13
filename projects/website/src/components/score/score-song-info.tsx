import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
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
  worth?: {
    value: number;
    icon: React.ComponentType<{ className?: string }>;
  };
  beatSaverMap?: BeatSaverMapResponse;
  clickableSongName?: boolean;
  leaderboardId?: number;
  imageSize?: number;
}

export default function ScoreSongInfo({
  song,
  level,
  worth,
  beatSaverMap,
  clickableSongName = true,
  leaderboardId,
  imageSize = 64,
}: ScoreSongInfoProps) {
  const mappersProfile =
    beatSaverMap != undefined ? `https://beatsaver.com/profile/${beatSaverMap.author.id}` : undefined;

  const diff = getDifficulty(level.difficulty);
  const WorthIcon = worth?.icon;

  return (
    <div className="flex w-full items-center gap-3">
      <div
        className="relative flex justify-center"
        style={{
          height: imageSize,
        }}
      >
        <Image
          src={song.art}
          width={imageSize}
          height={imageSize}
          alt={`${song.name}'s Artwork`}
          className="rounded-md"
          style={{
            minWidth: `${imageSize}px`,
          }}
        />
        <div
          className="absolute right-0 bottom-0 flex h-[18px] w-full cursor-default items-center justify-center rounded-sm text-[0.70rem]"
          style={{
            backgroundColor: `color-mix(in srgb, ${diff.color} 95%, transparent)`,
          }}
        >
          {worth != undefined && worth.value > 0 ? (
            <div className="flex items-center justify-center gap-1">
              <p>{worth.value.toFixed(2)}</p>
              {WorthIcon && <WorthIcon className="h-[14px] w-[14px]" />}
            </div>
          ) : (
            <p>{getDifficultyName(diff)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-1">
          <LeaderboardSongName
            leaderboardName={song.name}
            leaderboardId={leaderboardId}
            clickableSongName={clickableSongName}
          />

          {/* Author Info */}
          <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
            <p className="line-clamp-2 text-gray-400">
              {song.authorName}{" "}
              <span className="text-song-mapper">
                <FallbackLink
                  href={mappersProfile}
                  className={cn(mappersProfile && "hover:text-primary/80 text-xs leading-none transition-colors")}
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
