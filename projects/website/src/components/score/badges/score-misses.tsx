import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import Tooltip from "@/components/tooltip";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";

type ScoreMissesBadgeProps = ScoreBadgeProps & {
  /**
   * Hide the "X" mark for misses.
   */
  hideXMark?: boolean;
};

export default function ScoreMissesBadge({ score, hideXMark }: ScoreMissesBadgeProps) {
  return (
    <Tooltip
      display={
        <div className="flex flex-col">
          {!score.fullCombo ? (
            <>
              <p className="font-semibold">Misses</p>
              <p>Missed Notes: {formatNumberWithCommas(score.missedNotes)}</p>
              <p>Bad Cuts: {formatNumberWithCommas(score.badCuts)}</p>
              {score.additionalData && (
                <>
                  <p>Bomb Cuts: {formatNumberWithCommas(score.additionalData.bombCuts)}</p>
                  <p>Wall Hits: {formatNumberWithCommas(score.additionalData.wallsHit)}</p>
                </>
              )}
            </>
          ) : (
            <p>Full Combo</p>
          )}
        </div>
      }
    >
      <div className="flex gap-1 items-center justify-center">
        <p>{score.fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.misses)}</p>
        {!hideXMark && <XMarkIcon className={clsx("w-5 h-5", score.fullCombo ? "hidden" : "text-red-400")} />}
      </div>
    </Tooltip>
  );
}
