"use client";

import { Colors } from "@/common/colors";
import { DEFAULT_WHAT_IF_RANGE, SettingIds } from "@/common/database/database";
import Card from "@/components/card";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import useDatabase from "@/hooks/use-database";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { useDebounce } from "@uidotdev/usehooks";
import type { ChartOptions } from "chart.js";
import {
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";

// Register Chart.js components
Chart.register(LineController, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Props = {
  /**
   * The player the chart is for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardPpChart({ leaderboard }: Props) {
  const database = useDatabase();
  const whatIfRange = useLiveQuery(() => database.getWhatIfRange());

  const [values, setValues] = useState(DEFAULT_WHAT_IF_RANGE);
  const debouncedValues = useDebounce(values, 100);

  useEffect(() => {
    if (whatIfRange) {
      setValues(whatIfRange);
    }
  }, [whatIfRange]);

  const generateDataPoints = (min: number, max: number) => {
    const precision = 0.5; // Use a smaller step size for smoother curve
    const dataPoints = [];

    for (let accuracy = min; accuracy <= max; accuracy += precision) {
      dataPoints.push({
        x: accuracy,
        y: ScoreSaberCurve.getPp(leaderboard.stars, accuracy),
      });
    }

    return dataPoints;
  };

  const updateRange = (range: [number, number]) => {
    setValues(range);
    database.setSetting(SettingIds.WhatIfRange, range);
  };

  const data = {
    datasets: [
      {
        label: "PP",
        data: generateDataPoints(debouncedValues[0], debouncedValues[1]),
        borderColor: Colors.ranked,
        backgroundColor: Colors.rankedLight,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        type: "linear",
        min: debouncedValues[0],
        max: debouncedValues[1],
        title: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          color: "white",
          callback: value => `${value}%`,
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
        grid: {
          color: "#252525",
        },
      },
      y: {
        title: {
          display: true,
          text: "PP",
        },
        ticks: {
          color: "white",
          precision: 0,
          callback: value => {
            if (typeof value === "number") {
              return `${value.toFixed(0)}pp`;
            }
            return value;
          },
        },
        grid: {
          color: "#252525",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y.toFixed(2)}pp`;
          },
        },
      },
    },
    layout: {
      padding: {
        top: 20,
        right: 10,
        bottom: 20,
        left: 0,
      },
    },
  };

  return (
    <Card className="flex w-full flex-col gap-4">
      <div className="space-y-1">
        <h3 className="text-foreground text-lg font-semibold">PP Curve</h3>
        <p className="text-muted-foreground text-sm">
          Shows PP values for different accuracy percentages.
        </p>
      </div>

      <div className="h-[300px] sm:h-[400px]">
        <Line data={data} options={options} />
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
    </Card>
  );
}
