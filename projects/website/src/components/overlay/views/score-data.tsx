import { OverlayData } from "@/common/overlay/overlay-data";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type OverlayScoreDataProps = {
  /**
   * The data for the current score.
   */
  overlayData: OverlayData;
};

export default function OverlayScoreDataView({ overlayData }: OverlayScoreDataProps) {
  const scoreData = overlayData.score;
  if (!scoreData) {
    return null;
  }

  return (
    <div className="text-xl">
      <p>Combo: {formatNumberWithCommas(scoreData.combo)}x</p>
      <p>Score: {formatNumberWithCommas(scoreData.score)}</p>
      <p>Accuracy: {scoreData.accuracy.toFixed(2)}%</p>
      {overlayData.paused && <p className="text-red-500 italic text-md">Currently Paused</p>}
    </div>
  );
}
