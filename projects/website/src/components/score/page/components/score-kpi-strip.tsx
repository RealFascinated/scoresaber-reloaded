import { SharedIcons } from "@/shared-icons";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ReactNode } from "react";
import { DeltaChip } from "./delta-chip";

type KpiTileProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  delta?: ReactNode;
  valueClassName?: string;
};

function KpiTile({ label, value, icon, delta, valueClassName }: KpiTileProps) {
  return (
    <div className="bg-card ring-border flex flex-col gap-1.5 rounded-xl p-3 ring-1">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        {label}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`text-xl leading-none font-bold tabular-nums ${valueClassName ?? ""}`}>{value}</span>
        {delta}
      </div>
    </div>
  );
}

type ScoreKpiStripProps = {
  score: ScoreSaberScore;
};

export default function ScoreKpiStrip({ score }: ScoreKpiStripProps) {
  const change = score.previousScore?.change;
  const beatLeader = score.beatLeaderScore;
  const bombCuts = beatLeader?.misses.bombCuts;
  const wallsHit = beatLeader?.misses.wallsHit;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile
        label="Score"
        icon={<SharedIcons.StatTotalScoreIcon className="size-3.5" />}
        value={formatNumberWithCommas(score.score)}
        delta={
          change && <DeltaChip value={change.score} format={v => formatNumberWithCommas(Math.round(v))} />
        }
      />
      <KpiTile
        label="Best combo"
        icon={<SharedIcons.StatRankedPlayCountIcon className="size-3.5" />}
        value={formatNumberWithCommas(score.maxCombo)}
        delta={change && <DeltaChip value={change.maxCombo} format={v => formatNumberWithCommas(v)} />}
      />
      <KpiTile
        label="Misses"
        icon={<SharedIcons.WarningAlertIcon className="size-3.5" />}
        value={score.misses}
        valueClassName={score.misses === 0 ? "text-success" : undefined}
        delta={change && <DeltaChip lowerIsBetter value={change.misses} format={v => `${v}`} />}
      />
      <KpiTile
        label="Bad Cuts"
        icon={<SharedIcons.StatFullComboAccuracyIcon className="size-3.5" />}
        value={score.badCuts}
        delta={change && <DeltaChip lowerIsBetter value={change.badCuts} format={v => `${v}`} />}
      />
      {beatLeader ? (
        <>
          <KpiTile
            label="Bombs / walls hit"
            icon={<SharedIcons.MapBombsStatIcon className="size-3.5" />}
            value={`${bombCuts} / ${wallsHit}`}
          />
          <KpiTile
            label="Pauses"
            icon={<SharedIcons.StatScorePausesIcon className="size-3.5" />}
            value={beatLeader.pauses}
          />
        </>
      ) : (
        <KpiTile
          label="Missed Notes"
          icon={<SharedIcons.MapNotesStatIcon className="size-3.5" />}
          value={score.missedNotes}
          delta={change && <DeltaChip lowerIsBetter value={change.missedNotes} format={v => `${v}`} />}
        />
      )}
    </div>
  );
}
