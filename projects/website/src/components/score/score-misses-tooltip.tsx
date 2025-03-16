import SimpleTooltip from "@/components/simple-tooltip";
import { ensurePositiveNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ReactNode } from "react";

type ScoreMissesTooltipProps = {
  /**
   * The amount of missed notes.
   */
  missedNotes: number;

  /**
   * The amount of bad cuts.
   */
  badCuts: number;

  /**
   * The amount of bomb cuts.
   */
  bombCuts?: number;

  /**
   * The amount of walls hit.
   */
  wallsHit?: number;

  /**
   * The amount of pauses.
   */
  pauses?: number;

  /**
   * Whether the play was a full combo.
   */
  fullCombo?: boolean;

  /**
   * The tooltip children
   */
  children: ReactNode;
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
    <SimpleTooltip
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
          {pauses !== undefined ? (
            <p>Pauses: {formatNumberWithCommas(ensurePositiveNumber(pauses))}</p>
          ) : undefined}
        </div>
      }
    >
      {children}
    </SimpleTooltip>
  );
}
