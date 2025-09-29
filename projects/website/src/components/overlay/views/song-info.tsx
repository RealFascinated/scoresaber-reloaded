import { OverlayData } from "@/common/overlay/overlay-data";
import { cn } from "@/common/utils";
import OverlayView, { OverlayViewPosition } from "@/components/overlay/views/view";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";

type OverlaySongInfoProps = {
  overlayData: OverlayData;
};

export default function OverlaySongInfoView({ overlayData }: OverlaySongInfoProps) {
  const { map, paused } = overlayData;
  const { beatSaverMap } = map || {};
  if (!beatSaverMap) {
    return null;
  }

  const difficulty = getDifficulty(beatSaverMap.difficulty.difficulty);
  const leaderboard = map?.leaderboard;

  return (
    <OverlayView
      position={OverlayViewPosition.BOTTOM_LEFT}
      className={cn(paused ? "grayscale filter" : "", "flex gap-2 transition-all")}
    >
      <Image
        className="rounded-md"
        src={beatSaverMap.songArt}
        alt={`${beatSaverMap.name}`}
        width={112}
        height={112}
      />
      <div className="text-md flex flex-col justify-between gap-2 py-1">
        <div>
          <p className="font-bold">{beatSaverMap.metadata.songName}</p>
          {beatSaverMap.metadata.songAuthorName && (
            <p className="text-muted-foreground text-sm">
              by {beatSaverMap.metadata.songAuthorName}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Mapped by {truncateText(beatSaverMap.metadata.levelAuthorName, 48)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-fit rounded-md px-2 py-1 text-sm font-medium"
            style={{
              backgroundColor: difficulty.color,
              color: difficulty.color === "#FFFFFF" ? "#000000" : "#FFFFFF",
            }}
          >
            {getDifficultyName(difficulty)}
          </div>
           <div className="flex items-center [&>*:not(:last-child)]:after:content-['|'] [&>*:not(:last-child)]:after:mx-2 [&>*:not(:last-child)]:after:text-muted-foreground">
             <span>!bsr {beatSaverMap.bsr}</span>
             <span>{formatNumberWithCommas(beatSaverMap.metadata.bpm)} BPM</span>
             {leaderboard && leaderboard.stars > 0 && (
               <span className="text-primary">{leaderboard.stars} ★</span>
             )}
           </div>
        </div>
      </div>
    </OverlayView>
  );
}
