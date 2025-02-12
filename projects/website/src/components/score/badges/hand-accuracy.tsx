import { Change } from "@/components/change";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";
import Tooltip from "@/components/tooltip";
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
  const previousHandAccuracy = scoreImprovement
    ? handAccuracy[hand] - scoreImprovement.handAccuracy[hand]
    : undefined;
  const formattedHand = capitalizeFirstLetter(hand);

  return (
    <div className="flex gap-1 items-center justify-center">
      <Tooltip
        display={
          <>
            <p className="font-semibold">{formattedHand} Hand Accuracy</p>
            <p>Hand Accuracy: {currentHandAccuracy.toFixed(2)}</p>
            <p>Accuracy: {((currentHandAccuracy / 115) * 100).toFixed(2)}%</p>
          </>
        }
      >
        <p>{currentHandAccuracy.toFixed(2)}</p>
      </Tooltip>
      {scoreImprovement && previousHandAccuracy && (
        <Tooltip
          display={
            <>
              <p className="font-semibold">{formattedHand} Hand Accuracy</p>
              <p>Hand Accuracy: {previousHandAccuracy.toFixed(2)}</p>
              <p>Accuracy: {((previousHandAccuracy / 115) * 100).toFixed(2)}%</p>
            </>
          }
        >
          <Change
            className="text-xs"
            change={scoreImprovement.handAccuracy[hand]}
            formatValue={num => num.toFixed(2)}
          />
        </Tooltip>
      )}
    </div>
  );
}
