import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import { ScoreMissesTooltip } from "@/components/score/score-misses-tooltip";
import { Misses } from "@ssr/common/model/additional-score-data/misses";

type ScoreMissesBadgeProps = ScoreBadgeProps & {
  /**
   * Hide the "X" mark for misses.
   */
  hideXMark?: boolean;
};

export default function ScoreMissesBadge({ score, hideXMark }: ScoreMissesBadgeProps) {
  const additionalData = score.additionalData;
  const scoreImprovement = additionalData?.scoreImprovement;

  const misses = additionalData?.misses;
  const previousScoreMisses: Misses | undefined = misses &&
    additionalData &&
    scoreImprovement && {
      misses: misses.misses - scoreImprovement.misses.misses,
      missedNotes: misses.missedNotes - scoreImprovement.misses.missedNotes,
      badCuts: misses.badCuts - scoreImprovement.misses.badCuts,
      bombCuts: misses.bombCuts - scoreImprovement.misses.bombCuts,
      wallsHit: misses.wallsHit - scoreImprovement.misses.wallsHit,
    };

  return (
    <div className="flex flex-col justify-center items-center">
      <ScoreMissesTooltip
        missedNotes={score.missedNotes}
        badCuts={score.badCuts}
        bombCuts={misses?.bombCuts}
        wallsHit={misses?.wallsHit}
        fullCombo={score.fullCombo}
      >
        <div className="flex gap-1 items-center">
          <p>{score.fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.misses)}</p>
          {!hideXMark && <XMarkIcon className={clsx("w-5 h-5", score.fullCombo ? "hidden" : "text-red-400")} />}
        </div>
      </ScoreMissesTooltip>
      {additionalData && previousScoreMisses && scoreImprovement && misses && (
        <div className="flex gap-2 items-center justify-center">
          <ScoreMissesTooltip
            missedNotes={previousScoreMisses.missedNotes}
            badCuts={previousScoreMisses.badCuts}
            bombCuts={previousScoreMisses.bombCuts}
            wallsHit={previousScoreMisses.wallsHit}
            fullCombo={scoreImprovement.fullCombo}
          >
            <div className="flex gap-1 items-center">
              {scoreImprovement.fullCombo ? (
                <p className="text-green-400">FC</p>
              ) : (
                formatNumberWithCommas(previousScoreMisses.misses)
              )}
            </div>
          </ScoreMissesTooltip>
          <p>-&gt;</p>
          <ScoreMissesTooltip
            missedNotes={misses.missedNotes}
            badCuts={misses.badCuts}
            bombCuts={misses.bombCuts}
            wallsHit={misses.wallsHit}
            fullCombo={additionalData.fullCombo}
          >
            <div className="flex gap-1 items-center">
              {additionalData.fullCombo ? <p className="text-green-400">FC</p> : formatNumberWithCommas(misses.misses)}
            </div>
          </ScoreMissesTooltip>
        </div>
      )}
    </div>
  );
}
