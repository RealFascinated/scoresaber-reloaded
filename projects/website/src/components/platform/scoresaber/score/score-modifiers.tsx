import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { PreviousScore } from "@ssr/common/model/score/previous-score";
import { Modifier } from "@ssr/common/score/modifier";

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
