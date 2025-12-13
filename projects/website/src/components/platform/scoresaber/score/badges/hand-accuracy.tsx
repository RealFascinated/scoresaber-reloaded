import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import SimpleTooltip from "@/components/simple-tooltip";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";

type HandAccuracyProps = ScoreBadgeProps & {
  /**
   * The hand to get the hand accuracy from
   */
  hand: "left" | "right";
};

export function HandAccuracyBadge({ score, hand }: HandAccuracyProps) {
  if (!score.additionalData) {
    return undefined;
  }
  const { handAccuracy } = score.additionalData;
  const scoreImprovement = score.additionalData.scoreImprovement;
  const currentHandAccuracy = handAccuracy[hand];
  const previousHandAccuracy = scoreImprovement ? handAccuracy[hand] - scoreImprovement.handAccuracy[hand] : undefined;
  const formattedHand = capitalizeFirstLetter(hand);

  return (
    <div className="flex items-center justify-center gap-1">
      <SimpleTooltip
        display={
          <>
            <p className="font-semibold">{formattedHand} Hand Accuracy</p>
            <p>Hand Accuracy: {currentHandAccuracy.toFixed(2)}</p>
            <p>Accuracy: {((currentHandAccuracy / 115) * 100).toFixed(2)}%</p>
          </>
        }
        showOnMobile
      >
        <p>{currentHandAccuracy.toFixed(2)}</p>
      </SimpleTooltip>
      {scoreImprovement && previousHandAccuracy && (
        <SimpleTooltip
          display={
            <>
              <p className="font-semibold">{formattedHand} Hand Accuracy</p>
              <p>Hand Accuracy: {previousHandAccuracy.toFixed(2)}</p>
              <p>Accuracy: {((previousHandAccuracy / 115) * 100).toFixed(2)}%</p>
            </>
          }
          showOnMobile
        >
          <Change
            className="text-xs"
            change={scoreImprovement.handAccuracy[hand]}
            formatValue={num => num.toFixed(2)}
          />
        </SimpleTooltip>
      )}
    </div>
  );
}
