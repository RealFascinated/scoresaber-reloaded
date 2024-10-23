import Tooltip from "@/components/tooltip";
import { Change } from "@/common/change";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { capitalizeFirstLetter } from "@/common/string-utils";

type HandAccuracyProps = {
  /**
   * The score to get the hand accuracy from
   */
  score: ScoreSaberScore;

  /**
   * The hand to get the hand accuracy from
   */
  hand: "left" | "right";
};

export function HandAccuracy({ score, hand }: HandAccuracyProps) {
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
