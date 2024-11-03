import { ensurePositiveNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import Tooltip from "@/components/tooltip";

type ScoreMissesTooltipProps = {
  missedNotes: number;
  badCuts: number;
  bombCuts?: number;
  wallsHit?: number;
  pauses?: number;
  fullCombo?: boolean;

  /**
   * The tooltip children
   */
  children: React.ReactNode;
};

export function ScoreMissesTooltip({
  missedNotes,
  badCuts,
  bombCuts,
  wallsHit,
  pauses,
  fullCombo,
  children,
}: ScoreMissesTooltipProps) {
  return (
    <Tooltip
      display={
        <div className="flex flex-col w-full">
          {!fullCombo ? (
            <>
              <p className="font-semibold">Misses</p>
              <p>Missed Notes: {formatNumberWithCommas(ensurePositiveNumber(missedNotes))}</p>
              <p>Bad Cuts: {formatNumberWithCommas(ensurePositiveNumber(badCuts))}</p>
              {bombCuts !== undefined && wallsHit !== undefined && (
                <>
                  <p>Bomb Cuts: {formatNumberWithCommas(ensurePositiveNumber(bombCuts))}</p>
                  <p>Wall Hits: {formatNumberWithCommas(ensurePositiveNumber(wallsHit))}</p>
                </>
              )}
            </>
          ) : (
            <p>Full Combo</p>
          )}
          {pauses && pauses > 0 ? <p>Pauses: {formatNumberWithCommas(ensurePositiveNumber(pauses))}</p> : undefined}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
