"use client";

import React, { useState } from "react";
import GenericChart, { DatasetConfig } from "@/components/chart/generic-chart";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import Card from "@/components/card";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { useDebounce } from "@uidotdev/usehooks";

type Props = {
  /**
   * The player the chart is for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardPpChart({ leaderboard }: Props) {
  const [values, setValues] = useState([60, 100]);
  const debouncedValues = useDebounce(values, 100);

  const histories: Record<string, (number | null)[]> = {};
  const labels: string[] = [];

  const min = debouncedValues[0];
  const max = debouncedValues[1];
  const precision = min >= 60 ? 0.1 : 0.2;
  for (let accuracy = min; accuracy <= max; accuracy += precision) {
    const label = accuracy.toFixed(2) + "%";
    labels.push(label);

    const history = histories["pp"];
    if (!history) {
      histories["pp"] = [];
    }
    histories["pp"].push(scoresaberService.getPp(leaderboard.stars, accuracy));
  }

  const datasetConfig: DatasetConfig[] = [
    {
      title: "PP",
      field: "pp",
      color: "#3EC1D3",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        displayName: "PP",
        position: "left",
      },
      labelFormatter: (value: number) => `${value.toFixed(2)}pp`,
    },
  ];

  return (
    <Card className="w-full gap-7">
      <div className="flex flex-col h-64">
        <p className="font-semibold">PP Curve</p>
        <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
      </div>

      <div className="flex items-center justify-center">
        <div className="w-[95%]">
          <DualRangeSlider
            label={value => <span>{value}%</span>}
            value={values}
            onValueChange={setValues}
            min={5}
            max={100}
            step={1}
          />
        </div>
      </div>
    </Card>
  );
}
