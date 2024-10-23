import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
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

  /**
   * Limit the number of modifiers to display
   */
  limit?: number;
};

export function ScoreModifiers({ score, type, limit }: ScoreModifiersProps) {
  const modifiers = score.modifiers;
  if (modifiers.length === 0) {
    return <span>-</span>;
  }

  switch (type) {
    case "full":
      return <span>{modifiers.slice(0, limit).join(", ")}</span>;
    case "simple":
      return (
        <span>
          {Object.entries(Modifier)
            .filter(([_, mod]) => modifiers.includes(mod))
            .map(([mod, _]) => mod)
            .slice(0, limit)
            .join(",")}
        </span>
      );
  }
}
