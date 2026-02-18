import { OverlayData } from "@/common/overlay/overlay-data";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { formatPp } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";

type OverlayScoreDataProps = {
  /**
   * The data for the current score.
   */
  overlayData: OverlayData;
};

export default function OverlayScoreDataView({ overlayData }: OverlayScoreDataProps) {
  const scoreData = overlayData.score;
  const leaderboard = overlayData.map?.leaderboard;
  const pp =
    !leaderboard || leaderboard.stars === 0 || !scoreData
      ? undefined
      : ScoreSaberCurve.getPp(leaderboard.stars, scoreData.accuracy);

  // No score data, nothing to display
  if (!scoreData) {
    return null;
  }

  return (
    <div className="flex flex-col text-xl">
      {/* PP */}
      {!!leaderboard && pp && <b className="text-pp">{formatPp(pp)}pp</b>}

      {/* Accuracy */}
      <b
        style={{
          color: getScoreBadgeFromAccuracy(scoreData.accuracy).textColor,
        }}
      >
        {scoreData.accuracy.toFixed(2)}%
      </b>

      {/* Paused */}
      {overlayData.paused && <p className="text-md text-red-500 italic">Currently Paused</p>}
    </div>
  );
}
