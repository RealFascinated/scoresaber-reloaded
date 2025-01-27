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
    <div>
      <p>Combo: {formatNumberWithCommas(scoreData.combo)}</p>
      <p>Score: {formatNumberWithCommas(scoreData.score)}</p>
      <p>Accuracy: {scoreData.accuracy.toFixed(2)}%</p>
    </div>
  );
}
