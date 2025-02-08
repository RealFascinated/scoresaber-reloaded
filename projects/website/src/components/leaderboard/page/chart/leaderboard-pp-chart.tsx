"use client";

import { DatasetConfig } from "@/common/chart/types";
import { SettingIds } from "@/common/database/database";
import GenericChart from "@/components/chart/generic-chart";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import useDatabase from "@/hooks/use-database";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useDebounce } from "@uidotdev/usehooks";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

type Props = {
  /**
   * The player the chart is for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardPpChart({ leaderboard }: Props) {
  const database = useDatabase();
  const whatIfRange = useLiveQuery(() => database.getWhatIfRange());

  const [values, setValues] = useState([5, 100]);
  const debouncedValues = useDebounce(values, 100);

  useEffect(() => {
    if (whatIfRange) {
      setValues(whatIfRange);
    }
  }, [whatIfRange]);

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

  const updateRange = (range: [number, number]) => {
    setValues(range);
    database.setSetting(SettingIds.WhatIfRange, range);
  };

  const datasetConfig: DatasetConfig[] = [
    {
      title: "PP",
      field: "pp",
      color: "#3EC1D3",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        position: "left",
      },
      labelFormatter: (value: number) => `${value.toFixed(2)}pp`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <p className="font-semibold">PP Curve</p>
        <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
      </div>

      <div className="flex items-center justify-center">
        <div className="w-[95%]">
          <DualRangeSlider
            label={value => <span>{value}%</span>}
            value={values}
            onValueChange={updateRange}
            min={5}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}
