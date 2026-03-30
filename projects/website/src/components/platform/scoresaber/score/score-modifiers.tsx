import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getModifierLabel, Modifier } from "@ssr/common/score/modifier";
import type { PreviousScore } from "@ssr/migration/schemas/scoresaber/score/previous-score";

export function ScoreSaberScoreModifiers({
  score,
  type,
  limit,
}: {
  score: ScoreSaberScore | PreviousScore;
  type: "full" | "simple";
  limit?: number;
}) {
  const modifiers = score.modifiers;
  if (modifiers == undefined || modifiers.length === 0) {
    return <span>-</span>;
  }

  switch (type) {
    case "full":
      return <span>{modifiers.slice(0, limit).map(getModifierLabel).join(", ")}</span>;
    case "simple":
      return (
        <span>
          {Object.entries(Modifier)
            .filter(([, mod]) => modifiers.includes(mod))
            .map(([mod]) => mod)
            .slice(0, limit)
            .join(",")}
        </span>
      );
  }
}
