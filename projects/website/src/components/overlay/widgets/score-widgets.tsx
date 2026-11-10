import { useOverlayRuntime } from "@/common/overlay/overlay-runtime";
import { useOverlayScorePp } from "@/common/overlay/use-overlay-pp";
import { cn } from "@/common/utils";
import type { PpOptions } from "@ssr/common/schemas/overlay/overlay-element";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";
import { PpValue } from "./pp-widget";

export function ScoreAccuracyWidget() {
  const { data } = useOverlayRuntime();
  if (!data.score) {
    return null;
  }
  return (
    <p
      className={cn("text-5xl font-bold whitespace-nowrap tabular-nums", data.paused && "opacity-60")}
      style={{ color: getScoreBadgeFromAccuracy(data.score.accuracy).textColor }}
    >
      {data.score.accuracy.toFixed(2)}%
    </p>
  );
}

export function ScoreComboWidget() {
  const { data } = useOverlayRuntime();
  if (!data.score) {
    return null;
  }
  return (
    <p className="text-4xl font-bold whitespace-nowrap tabular-nums">
      {formatNumberWithCommas(data.score.combo)}
      <span className="text-muted-foreground ml-1 text-2xl font-medium">combo</span>
    </p>
  );
}

export function ScoreScoreWidget() {
  const { data } = useOverlayRuntime();
  if (!data.score) {
    return null;
  }
  return (
    <p className="text-4xl font-bold whitespace-nowrap tabular-nums">
      {formatNumberWithCommas(data.score.score)}
    </p>
  );
}

export function ScorePpWidget({ options }: { options: PpOptions }) {
  const runtime = useOverlayRuntime();
  const { scoreSaber } = useOverlayScorePp(runtime);
  if (scoreSaber === undefined) {
    return null;
  }
  return (
    <PpValue pp={scoreSaber} source="SS" showPlatform={options.showPlatform} dimmed={runtime.data.paused} />
  );
}

export function ScoreBlPpWidget({ options }: { options: PpOptions }) {
  const runtime = useOverlayRuntime();
  const { beatLeader } = useOverlayScorePp(runtime);
  if (beatLeader === undefined) {
    return null;
  }
  return (
    <PpValue pp={beatLeader} source="BL" showPlatform={options.showPlatform} dimmed={runtime.data.paused} />
  );
}
