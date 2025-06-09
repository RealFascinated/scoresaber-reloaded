import { openInNewTab } from "@/common/browser-utils";
import { LoadingIcon } from "@/components/loading-icon";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { Chart, ChartOptions, registerables } from "chart.js";
import { useState } from "react";
import { Line } from "react-chartjs-2";

Chart.register(...registerables);

type PlayerScoreChartProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

const minimumStar = 10;

const PlayerScoreChart = ({ player }: PlayerScoreChartProps) => {
  const [accuracyRange, setAccuracyRange] = useState<number[]>([0, 100]);

  const { data: dataPoints } = useQuery({
    queryKey: ["player-score-chart", player.id],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerScoreChartData(player.id);
      if (!scoreChartData) {
        return [];
      }

      return scoreChartData.data;
    },
  });

  /**
   * Callback for when a data point is clicked.
   *
   * @param leaderboardId
   */
  const onDataPointClick = (leaderboardId: number) => {
    openInNewTab(`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`);
  };

  const data = dataPoints?.map(dataPoint => {
    return {
      x: dataPoint.stars,
      y: dataPoint.accuracy,
      leaderboardId: Number(dataPoint.leaderboardId),
      leaderboardName: dataPoint.leaderboardName,
      leaderboardDifficulty: dataPoint.leaderboardDifficulty,
    };
  });

  const datasets = {
    datasets: [
      {
        type: "scatter",
        label: "Data Points",
        data: data,
        pointRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.5)",
        pointBorderColor: "rgba(255, 255, 255, 0.5)",
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "rgba(255, 255, 255, 0.8)",
      },
    ],
  };

  const highestStar = Math.ceil(
    data ? Math.max(minimumStar, Math.max(...data.map(point => point.x))) : minimumStar
  );

  const options: ChartOptions = {
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: highestStar,
        grid: {
          color: "#252525",
        },
        ticks: {
          color: "white",
        },
        title: {
          display: true,
          text: "Star Rating",
          color: "white",
        },
      },
      y: {
        type: "linear",
        min: accuracyRange[0],
        max: accuracyRange[1],
        grid: {
          color: "#252525",
        },
        ticks: {
          color: "white",
        },
        title: {
          display: true,
          text: "Score %",
          color: "white",
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataPoint = context.raw;
            return [
              `${dataPoint.leaderboardName} [${dataPoint.leaderboardDifficulty}]`,
              `${dataPoint.x.toFixed(2)} ⭐ - ${dataPoint.y.toFixed(2)}%`,
              "",
              "Click to view leaderboard!",
            ];
          },
        },
      },
      legend: {
        display: false,
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const dataPoint = data?.[dataIndex];
        if (dataPoint) {
          onDataPointClick(dataPoint.leaderboardId);
        }
      }
    },
  };

  return (
    <div className="flex justify-center flex-col gap-6">
      {data && (
        <>
          <div className="h-[500px]">
            <Line className="max-w-[100%]" data={datasets as any} options={options as any} />
          </div>
          <DualRangeSlider
            min={0}
            max={100}
            value={[accuracyRange[0], accuracyRange[1]]}
            label={value => value}
            onValueChange={value => {
              setAccuracyRange([value[0], value[1]]);
            }}
            step={1}
          />
        </>
      )}
      {!data && <LoadingIcon />}
    </div>
  );
};

export default PlayerScoreChart;
