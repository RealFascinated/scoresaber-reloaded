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
  const modifiers = score.modifiers;
  if (modifiers.length === 0) {
    return <p>-</p>;
  }

  switch (type) {
    case "full":
      return <span>{modifiers.join(", ")}</span>;
    case "simple":
      return (
        <span>
          {Object.entries(Modifier)
            .filter(([_, mod]) => modifiers.includes(mod))
            .map(([mod, _]) => mod)
            .join(",")}
        </span>
      );
  }
}
