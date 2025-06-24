import { OverlayData } from "@/common/overlay/overlay-data";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";

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
  const leaderboard = overlayData.map?.leaderboard;
  const pp =
    leaderboard && leaderboard.stars > 0
      ? ScoreSaberCurve.getPp(leaderboard.stars, scoreData.accuracy)
      : undefined;

  return (
    <div className="text-xl">
      {/* Score Information */}
      <p>Combo: {formatNumberWithCommas(scoreData.combo)}x</p>
      <p>Score: {formatNumberWithCommas(scoreData.score)}</p>
      <p>Accuracy: {scoreData.accuracy.toFixed(2)}%</p>
      {!!leaderboard && pp && <p>{formatPp(pp)}pp</p>}

      {/* Paused */}
      {overlayData.paused && <p className="text-md text-red-500 italic">Currently Paused</p>}
    </div>
  );
}
