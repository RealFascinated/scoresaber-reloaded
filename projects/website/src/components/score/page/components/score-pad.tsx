import Card from "@/components/card";
import { ReactNode } from "react";

export type PadCell = {
  key: string;
  /** Short label shown next to the score, like an arrow. */
  icon?: ReactNode;
  /** Average score out of 115, or undefined when nothing was hit here. */
  score?: number;
  cuts: number;
  mistakes: number;
  tooltip: string;
};

type ScorePadProps = {
  title: string;
  description: string;
  columns: number;
  cells: PadCell[];
  footnote?: ReactNode;
};

/**
 * A grid of tiles colored by average score, used for both cut directions and grid positions.
 */
export default function ScorePad({ title, description, columns, cells, footnote }: ScorePadProps) {
  const scored = cells.filter(cell => cell.score !== undefined && cell.cuts > 0);
  const scores = scored.map(cell => cell.score ?? 0);
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const range = Math.max((scores.length > 0 ? Math.max(...scores) : 0) - min, 0.01);
  const weakest =
    scored.length > 1 ? scored.reduce((a, b) => ((b.score ?? 0) < (a.score ?? 0) ? b : a)) : undefined;

  return (
    <Card className="gap-3 rounded-xl">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cells.map(cell => {
          const empty = cell.score === undefined || cell.cuts === 0;
          const intensity = empty ? 0 : 15 + (((cell.score ?? 0) - min) / range) * 60;
          return (
            <div
              key={cell.key}
              title={cell.tooltip}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg p-1 text-center ring-1 ${
                weakest?.key === cell.key ? "ring-danger" : "ring-border"
              }`}
              style={{
                backgroundColor: empty
                  ? undefined
                  : `color-mix(in oklab, var(--primary) ${intensity}%, transparent)`,
              }}
            >
              {cell.icon}
              {empty ? (
                <span className="text-muted-foreground text-xs">–</span>
              ) : (
                <>
                  <span className="text-sm leading-none font-bold tabular-nums">
                    {(cell.score ?? 0).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-[10px] leading-none tabular-nums">
                    {cell.cuts} hit{cell.cuts === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">The red outline marks your weakest tile. {footnote}</p>
    </Card>
  );
}
