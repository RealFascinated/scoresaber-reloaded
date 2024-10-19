import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import { Modifier } from "@ssr/common/score/modifier";

type ScoreModifiersProps = {
  /**
   * The score to get the modifiers from
   */
  score: ScoreSaberScore;

  /**
   * The way to display the modifiers
   */
  type: "full" | "simple";
};

export function ScoreModifiers({ score, type }: ScoreModifiersProps) {
  switch (type) {
    case "full":
      return <span>{score.modifiers.join(", ")}</span>;
    case "simple":
      return (
        <span>
          {Object.entries(Modifier)
            .filter(mod => score.modifiers.includes(mod[1] as Modifier))
            .map(mod => mod[0])
            .join(",")}
        </span>
      );
  }
}
