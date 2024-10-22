import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import Tooltip from "@/components/tooltip";

type ScoreMissesTooltipProps = {
  missedNotes: number;
  badCuts: number;
  bombCuts?: number;
  wallsHit?: number;
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
  fullCombo,
  children,
}: ScoreMissesTooltipProps) {
  return (
    <Tooltip
      display={
        <div className="flex flex-col">
          {!fullCombo ? (
            <>
              <p className="font-semibold">Misses</p>
              <p>Missed Notes: {formatNumberWithCommas(missedNotes)}</p>
              <p>Bad Cuts: {formatNumberWithCommas(badCuts)}</p>
              {bombCuts !== undefined && wallsHit !== undefined && (
                <>
                  <p>Bomb Cuts: {formatNumberWithCommas(bombCuts)}</p>
                  <p>Wall Hits: {formatNumberWithCommas(wallsHit)}</p>
                </>
              )}
            </>
          ) : (
            <p>Full Combo</p>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
