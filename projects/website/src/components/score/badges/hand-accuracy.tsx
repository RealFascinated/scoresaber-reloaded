import Tooltip from "@/components/tooltip";
import { Change } from "@/common/change";
import { capitalizeFirstLetter } from "@/common/string-utils";
import { ScoreBadgeProps } from "@/components/score/badges/badge-props";

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
  const previousHandAccuracy = scoreImprovement ? handAccuracy[hand] - scoreImprovement.handAccuracy[hand] : undefined;
  const formattedHand = capitalizeFirstLetter(hand);

  return (
    <div className="flex flex-col items-center justify-center">
      <Tooltip display={`${formattedHand} Hand Accuracy`}>
        <p>{handAccuracy[hand].toFixed(2)}</p>
      </Tooltip>
      {scoreImprovement && previousHandAccuracy && (
        <Tooltip display={`Previous ${formattedHand} Hand Accuracy: ${previousHandAccuracy.toFixed(2)}`}>
          <Change change={scoreImprovement.handAccuracy[hand]} formatValue={num => num.toFixed(2)} />
        </Tooltip>
      )}
    </div>
  );
}
