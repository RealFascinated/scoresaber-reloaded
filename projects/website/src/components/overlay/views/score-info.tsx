import { OverlayData } from "@/common/overlay/overlay-data";
import { cn } from "@/common/utils";
import OverlayView, { OverlayViewPosition } from "@/components/overlay/views/view";
import { truncateText } from "@ssr/common/string-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";

type OverlayScoreDataProps = {
  overlayData: OverlayData;
};

export default function OverlayScoreInfoView({ overlayData }: OverlayScoreDataProps) {
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
      className={cn(paused ? "filter grayscale" : "", "flex gap-2 transform-gpu transition-all")}
    >
      <Image
        className="rounded-md"
        src={beatSaverMap.songArt}
        alt={`${beatSaverMap.name}`}
        width={96}
        height={96}
      />
      <div className="flex flex-col gap-2 py-1 justify-between text-md">
        <div>
          <p className="font-semibold">
            {beatSaverMap.metadata.songAuthorName} - {beatSaverMap.metadata.songName}
          </p>
          <p>Mapped by {truncateText(beatSaverMap.metadata.levelAuthorName, 48)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div
            className="w-fit px-1 py-0.5 rounded-md"
            style={{
              backgroundColor: difficulty.color,
            }}
          >
            <p>{getDifficultyName(difficulty)}</p>
          </div>
          <p>
            !bsr {beatSaverMap.bsr} - {formatNumberWithCommas(beatSaverMap.metadata.bpm)} BPM{" "}
            {leaderboard && leaderboard.stars > 0 ? ` - ${leaderboard.stars} ★` : ""}
          </p>
        </div>
      </div>
    </OverlayView>
  );
}
