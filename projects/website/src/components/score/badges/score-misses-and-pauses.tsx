import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import { ScoreMissesTooltip } from "@/components/score/score-misses-tooltip";

type ScoreMissesBadgeProps = ScoreBadgeProps & {
  /**
   * Hide the "X" mark for misses.
   */
  hideXMark?: boolean;

  /**
   * Hide the "vs" text for previous score.
   */
  hidePreviousScore?: boolean;
};

export default function ScoreMissesAndPausesBadge({ score, hideXMark, hidePreviousScore }: ScoreMissesBadgeProps) {
  const previousScore = score.previousScore;
  const additionalData = score.additionalData;
  const previousMisses = additionalData?.misses;

  return (
    <div className="flex flex-row justify-center items-center w-full gap-1">
      <ScoreMissesTooltip
        missedNotes={score.missedNotes}
        badCuts={score.badCuts}
        bombCuts={previousMisses?.bombCuts}
        wallsHit={previousMisses?.wallsHit}
        pauses={additionalData?.pauses}
        fullCombo={score.fullCombo}
      >
        <span>
          {score.fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.misses)}
        </span>
        {!hideXMark && !score.fullCombo && <span>x</span>}
      </ScoreMissesTooltip>
      {previousScore && !hidePreviousScore && (
        <ScoreMissesTooltip
          missedNotes={previousScore.missedNotes}
          badCuts={previousScore.badCuts}
          bombCuts={previousMisses?.bombCuts}
          wallsHit={previousMisses?.wallsHit}
          pauses={
            additionalData && additionalData.scoreImprovement?.pauses
              ? additionalData.scoreImprovement.pauses - additionalData?.pauses
              : 0
          }
          fullCombo={previousScore.fullCombo}
        >
          <span className="text-xs">
            (vs{" "}
            {previousScore.fullCombo ? (
              <span className="text-green-400">FC</span>
            ) : (
              formatNumberWithCommas(previousScore.misses)
            )}
            {!hideXMark && !previousScore.fullCombo && <span>x</span>})
          </span>
        </ScoreMissesTooltip>
      )}
    </div>
  );
}
