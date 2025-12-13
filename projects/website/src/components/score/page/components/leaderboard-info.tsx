import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import { MapIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import Image from "next/image";

export default function LeaderboardInfo({
  leaderboard,
  beatSaver,
}: {
  leaderboard: ScoreSaberLeaderboard;
  beatSaver?: BeatSaverMapResponse;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      {/* Song Art */}
      <Image
        src={leaderboard.songArt}
        alt={`${leaderboard.songName} Cover Image`}
        className="h-20 w-20 rounded-lg object-cover"
        width={80}
        height={80}
      />

      {/* Song Info */}
      <div className="min-w-0 flex-1">
        <div className="space-y-1.5">
          {/* Song Name */}
          <FallbackLink
            href={beatSaver ? `https://beatsaver.com/maps/${beatSaver?.bsr}` : undefined}
            className="hover:text-primary/80 transition-all"
          >
            <h3 className="text-foreground mb-1 line-clamp-2 text-xl leading-tight font-bold">
              {leaderboard.fullName}
            </h3>
          </FallbackLink>

          {/* Song Author */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <MusicalNoteIcon className="h-3 w-3" />
              <span>{leaderboard.songAuthorName}</span>
            </div>
          </div>

          {/* Mapper */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
              <MapIcon className="h-3 w-3" />
              <FallbackLink href={getBeatSaverMapperProfileUrl(beatSaver)}>
                <span className={cn("font-medium", beatSaver ? "hover:text-primary/80 transition-all" : "")}>
                  {leaderboard.levelAuthorName}
                </span>
              </FallbackLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
