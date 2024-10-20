import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import Tooltip from "@/components/tooltip";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";

export default function FullComboBadge({ score }: ScoreBadgeProps) {
  return (
    <Tooltip
      display={
        <div className="flex flex-col">
          {!score.fullCombo ? (
            <>
              <p className="font-semibold">Misses</p>
              <p>Missed Notes: {formatNumberWithCommas(score.missedNotes)}</p>
              <p>Bad Cuts: {formatNumberWithCommas(score.badCuts)}</p>
            </>
          ) : (
            <p>Full Combo</p>
          )}
        </div>
      }
    >
      <div className="flex gap-1">
        <p>{score.fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.misses)}</p>
        <XMarkIcon className={clsx("w-5 h-5", score.fullCombo ? "hidden" : "text-red-400")} />
      </div>
    </Tooltip>
  );
}
