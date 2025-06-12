"use client";

import { Colors } from "@/common/colors";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, formatDateMinimal, getDaysAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import {
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type ScoreHistoryGraphScore = {
  score: number;
  accuracy: number;
  misses: number;
  pp: number;
  timestamp: Date;
};

type ScoreHistoryProps = {
  /**
   * The player who set this score.
   */
  playerId: string;

  /**
   * The leaderboard the score was set on.
   */
  leaderboardId: string;
};

export function ScoreHistoryGraph({ playerId, leaderboardId }: ScoreHistoryProps) {
  const { data: scoreHistory } = useQuery({
    queryKey: ["score-history", playerId, leaderboardId],
    queryFn: () => ssrApi.getScoreHistoryGraph(playerId, leaderboardId),
  });

  if (!scoreHistory) {
    return (
      <div className="flex justify-center">
        <p>Unable to load score history chart, missing data...</p>
      </div>
    );
  }

  const labels = scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.timestamp);

  const datasets = [
    ...(!scoreHistory.isRanked
      ? [
          {
            label: "Score",
            data: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.score),
            borderColor: Colors.primary,
            backgroundColor: Colors.primary,
            yAxisID: "y",
            tension: 0.4,
            pointRadius: labels.length > 90 ? 0 : 3,
            hoverRadius: 4,
          },
        ]
      : [
          {
            label: "PP",
            data: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.pp),
            borderColor: Colors.ssr,
            backgroundColor: Colors.ssr,
            yAxisID: "y",
            tension: 0.4,
            pointRadius: labels.length > 90 ? 0 : 3,
            hoverRadius: 4,
          },
        ]),
    {
      label: "Accuracy",
      data: scoreHistory.scores.map((score: ScoreHistoryGraphScore) => score.accuracy),
      borderColor: Colors.generic.green,
      backgroundColor: Colors.generic.green,
      yAxisID: "y1",
      tension: 0.4,
      pointRadius: labels.length > 90 ? 0 : 3,
      hoverRadius: 4,
    },
  ];

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        grid: { color: "#252525" },
        ticks: {
          color: "white",
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: 10,
          callback: (value: any, index: number) => {
            const date = labels[index];
            return formatDateMinimal(date);
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "right" as const,
        grid: { color: "#252525" },
        title: {
          display: true,
          text: scoreHistory.isRanked ? "PP" : "Score",
          color: "white",
          font: {
            size: 12,
            weight: "normal",
          },
          padding: { top: 0, bottom: 0, y: 10 },
        },
        ticks: {
          color: "white",
          callback: value => {
            if (typeof value === "number") {
              return scoreHistory.isRanked ? formatPp(value) : formatNumberWithCommas(value);
            }
            return value;
          },
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "left" as const,
        grid: { drawOnChartArea: false },
        title: {
          display: true,
          text: "Accuracy",
          color: "white",
          font: {
            size: 12,
            weight: "normal",
          },
          padding: { top: 0, bottom: 0, y: 10 },
        },
        ticks: {
          color: "white",
          callback: value => {
            if (typeof value === "number") {
              return `${value.toFixed(2)}%`;
            }
            return value;
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "white",
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const value = labels[context[0].dataIndex];
            const daysAgo = getDaysAgo(value);
            const formattedDate = formatDate(value, "Do MMMM, YYYY");
            if (daysAgo === 0) return `${formattedDate} (Now)`;
            if (daysAgo === 1) return `${formattedDate} (Yesterday)`;
            return `${formattedDate} (${daysAgo} days ago)`;
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const label = context.dataset.label;
            if (label === "Accuracy") {
              return `${label}: ${value.toFixed(2)}%`;
            }
            return `${label}: ${scoreHistory.isRanked ? formatPp(value) : formatNumberWithCommas(value)}`;
          },
        },
      },
    },
  };

  return (
    <div className="flex relative h-[380px] w-full">
      <div className="block h-[380px] w-full relative">
        <Line options={options} data={{ labels, datasets }} />
      </div>
    </div>
  );
}
