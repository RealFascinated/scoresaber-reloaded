"use client";

import { ChartConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import { DEFAULT_WHAT_IF_RANGE, SettingIds } from "@/common/database/database";
import GenericChart from "@/components/api/chart/generic-chart";
import ScoreButton from "@/components/score/button/score-button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { useDebounce } from "@uidotdev/usehooks";
import { ChartBarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  /**
   * The player the chart is for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardPpChartButton({ leaderboard }: Props) {
  const database = useDatabase();
  const whatIfRange = useStableLiveQuery(() => database.getWhatIfRange());

  const [values, setValues] = useState(DEFAULT_WHAT_IF_RANGE);
  const debouncedValues = useDebounce(values, 100);

  useEffect(() => {
    if (whatIfRange) {
      setValues(whatIfRange);
    }
  }, [whatIfRange]);

  const updateRange = (range: [number, number]) => {
    setValues(range);
    database.setSetting(SettingIds.WhatIfRange, range);
  };

  const { labels, dataPoints } = useMemo(() => {
    const precision = 0.05;
    const labels: number[] = [];
    const dataPoints: (number | null)[] = [];

    for (let accuracy = debouncedValues[0]; accuracy <= debouncedValues[1]; accuracy += precision) {
      labels.push(accuracy);
      dataPoints.push(ScoreSaberCurve.getPp(leaderboard.stars, accuracy));
    }

    return { labels, dataPoints };
  }, [debouncedValues, leaderboard.stars]);

  const chartConfig: ChartConfig = useMemo(
    () => ({
      datasets: [
        {
          label: "PP",
          data: dataPoints,
          color: Colors.pp,
          axisId: "y",
          type: "line",
          pointRadius: 0,
          showLegend: true,
          labelFormatter: (value: number) => `${value.toFixed(2)}pp`,
        },
      ],
      axes: {
        x: {
          display: true,
          displayName: "",
          valueFormatter: (value: number) => `${value.toFixed(2)}%`,
        },
        y: {
          display: true,
          position: "left",
          displayName: "PP",
          valueFormatter: (value: number) => `${value.toFixed(0)}pp`,
        },
      },
      options: {
        layout: {
          padding: {
            top: 20,
            right: 10,
            bottom: 20,
            left: 0,
          },
        },
        scales: {
          x: {
            type: "linear",
            min: debouncedValues[0],
            max: debouncedValues[1],
            grid: { color: "#252525" },
            ticks: {
              stepSize: 1,
              callback: (value: number) => `${value.toFixed(2)}%`,
              maxRotation: 45,
              minRotation: 45,
              color: "white",
              font: {
                size: 11,
              },
            },
            title: {
              display: false,
            },
          },
        },
      },
    }),
    [dataPoints, debouncedValues]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <ScoreButton tooltip={<p>View PP Chart</p>}>
          <ChartBarIcon className="h-4 w-4" />
        </ScoreButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle>PP Chart</DialogTitle>
        <div className="h-[300px] sm:h-[400px]">
          <GenericChart config={chartConfig} labels={labels} />
        </div>

        <div className="flex items-center justify-center">
          <div className="w-[95%]">
            <DualRangeSlider
              label={value => <span>{value}%</span>}
              value={values}
              onValueChange={updateRange}
              min={DEFAULT_WHAT_IF_RANGE[0]}
              max={100}
              step={0.5}
              showLabelOnHover={false}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
