import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { formatAccuracyDelta, getPbAccuracyAt } from "@/common/overlay/pb";
import { useSongTime } from "@/common/overlay/use-song-time";
import { cn } from "@/common/utils";
import type { PbDeltaOptions } from "@ssr/common/schemas/overlay/overlay-element";

/**
 * The PB value to show at the current song time, undefined when there is nothing to compare to.
 */
export function usePbDeltaValue(): { pbAccuracy: number; accuracy: number; finalOnly: boolean } | undefined {
  const { data, pb } = useOverlayRuntime();
  const songTime = useSongTime(data);
  const pbAccuracy = getPbAccuracyAt(pb, songTime);
  if (!data.score || pbAccuracy === undefined) {
    return undefined;
  }
  return { pbAccuracy, accuracy: data.score.accuracy, finalOnly: pb?.source === "final-only" };
}

export function PbDeltaWidget({ options }: { options: PbDeltaOptions }) {
  const value = usePbDeltaValue();
  if (!value) {
    return null;
  }

  const delta = value.accuracy - value.pbAccuracy;
  const ahead = Number(delta.toFixed(options.precision)) >= 0;
  const caption = value.finalOnly ? "vs PB final" : "PB";

  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
      <p
        className={cn(
          "text-4xl font-bold",
          options.mode === "delta" ? (ahead ? "text-success" : "text-danger") : "text-foreground"
        )}
      >
        {options.mode === "delta"
          ? formatAccuracyDelta(delta, options.precision)
          : `${value.pbAccuracy.toFixed(options.precision)}%`}
      </p>
      {options.showLabel && <p className="text-muted-foreground text-xl">{caption}</p>}
    </div>
  );
}
