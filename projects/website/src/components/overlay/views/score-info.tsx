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
      className={cn(paused ? "grayscale filter" : "", "flex gap-2 transition-all")}
    >
      <Image
        className="rounded-md"
        src={beatSaverMap.songArt}
        alt={`${beatSaverMap.name}`}
        width={96}
        height={96}
      />
      <div className="text-md flex flex-col justify-between gap-2 py-1">
        <div>
          <p className="font-semibold">{beatSaverMap.metadata.songName}</p>
          <p>Mapped by {truncateText(beatSaverMap.metadata.levelAuthorName, 48)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-fit rounded-md px-1 py-0.5"
            style={{
              backgroundColor: difficulty.color,
            }}
          >
            <p>{getDifficultyName(difficulty)}</p>
          </div>
          <p>
            !bsr {beatSaverMap.bsr} | {formatNumberWithCommas(beatSaverMap.metadata.bpm)} BPM{" "}
            {leaderboard && leaderboard.stars > 0 ? (
              <>
                {" | "}
                <span className="text-pp"> {leaderboard.stars} ★</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </OverlayView>
  );
}
