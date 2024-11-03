import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import { ScoreMissesTooltip } from "@/components/score/score-misses-tooltip";
import { Misses } from "@ssr/common/model/additional-score-data/misses";

type ScoreMissesBadgeProps = ScoreBadgeProps & {
  /**
   * Hide the "X" mark for misses.
   */
  hideXMark?: boolean;
};

export default function ScoreMissesAndPausesBadge({ score, hideXMark }: ScoreMissesBadgeProps) {
  const additionalData = score.additionalData;
  const scoreImprovement = additionalData?.scoreImprovement;

  const misses = additionalData?.misses;
  const previousScoreMisses: Misses | undefined = misses &&
    additionalData &&
    scoreImprovement && {
      misses: (scoreImprovement.misses.misses - misses.misses) * -1,
      missedNotes: (scoreImprovement.misses.missedNotes - misses.missedNotes) * -1,
      badCuts: (scoreImprovement.misses.badCuts - misses.badCuts) * -1,
      bombCuts: (scoreImprovement.misses.bombCuts - misses.bombCuts) * -1,
      wallsHit: (scoreImprovement.misses.wallsHit - misses.wallsHit) * -1,
    };
  const previousScoreFc = previousScoreMisses?.misses == 0;
  const isMissImprovement =
    previousScoreMisses && scoreImprovement && previousScoreMisses.misses > scoreImprovement.misses.misses;

  const pauses = additionalData?.pauses;
  return (
    <div className="flex flex-col justify-center items-center w-full">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <ScoreMissesTooltip
            missedNotes={score.missedNotes}
            badCuts={score.badCuts}
            bombCuts={misses?.bombCuts}
            wallsHit={misses?.wallsHit}
            pauses={additionalData?.pauses}
            fullCombo={score.fullCombo}
          >
            <p>
              {score.fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.misses)}
              {!hideXMark && !score.fullCombo && <span>x</span>}
            </p>
          </ScoreMissesTooltip>
          {additionalData && previousScoreMisses && scoreImprovement && misses && isMissImprovement && (
            <ScoreMissesTooltip
              missedNotes={previousScoreMisses.missedNotes}
              badCuts={previousScoreMisses.badCuts}
              bombCuts={previousScoreMisses.bombCuts}
              wallsHit={previousScoreMisses.wallsHit}
              pauses={scoreImprovement.pauses}
              fullCombo={previousScoreFc}
            >
              <div className="text-xs flex flex-row gap-1">
                <p>(vs {previousScoreFc ? "FC" : formatNumberWithCommas(previousScoreMisses.misses)}x)</p>
              </div>
            </ScoreMissesTooltip>
          )}
        </div>
        {/*{additionalData && !!pauses && pauses > 0 && (*/}
        {/*  <>*/}
        {/*    <p>|</p>*/}
        {/*    <Tooltip*/}
        {/*      display={*/}
        {/*        <p>*/}
        {/*          {pauses}x Pause{pauses > 1 ? "s" : ""}*/}
        {/*        </p>*/}
        {/*      }*/}
        {/*    >*/}
        {/*      <div className="flex gap-1 items-center">*/}
        {/*        <p>{pauses && pauses}</p>*/}
        {/*        <PauseIcon className="w-4 h-4" />*/}
        {/*      </div>*/}
        {/*    </Tooltip>*/}
        {/*  </>*/}
        {/*)}*/}
      </div>
      {/*{additionalData && previousScoreMisses && scoreImprovement && misses && isMissImprovement && (*/}
      {/*  <div className="flex gap-2 items-center justify-center">*/}
      {/*    <ScoreMissesTooltip*/}
      {/*      missedNotes={previousScoreMisses.missedNotes}*/}
      {/*      badCuts={previousScoreMisses.badCuts}*/}
      {/*      bombCuts={previousScoreMisses.bombCuts}*/}
      {/*      wallsHit={previousScoreMisses.wallsHit}*/}
      {/*      fullCombo={previousScoreFc}*/}
      {/*    >*/}
      {/*      <div className="flex gap-1 items-center text-xs">*/}
      {/*        {previousScoreFc ? (*/}
      {/*          <p className="text-green-400">FC</p>*/}
      {/*        ) : (*/}
      {/*          formatNumberWithCommas(previousScoreMisses.misses)*/}
      {/*        )}*/}
      {/*      </div>*/}
      {/*    </ScoreMissesTooltip>*/}
      {/*    <p>-&gt;</p>*/}
      {/*    <ScoreMissesTooltip*/}
      {/*      missedNotes={misses.missedNotes}*/}
      {/*      badCuts={misses.badCuts}*/}
      {/*      bombCuts={misses.bombCuts}*/}
      {/*      wallsHit={misses.wallsHit}*/}
      {/*      fullCombo={additionalData.fullCombo}*/}
      {/*    >*/}
      {/*      <div className="flex gap-1 items-center text-xs">*/}
      {/*        {additionalData.fullCombo ? <p className="text-green-400">FC</p> : formatNumberWithCommas(misses.misses)}*/}
      {/*      </div>*/}
      {/*    </ScoreMissesTooltip>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
}
