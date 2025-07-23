"use client";

import { Colors } from "@/common/colors";
import { EmptyState } from "@/components/ui/empty-state";
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
import { ClockIcon } from "lucide-react";
import { Line } from "react-chartjs-2";
import Card from "@/components/card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

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

export default function ScoreHistoryGraph({ playerId, leaderboardId }: ScoreHistoryProps) {
  const { data: scoreHistory } = useQuery({
    queryKey: ["score-history", playerId, leaderboardId],
    queryFn: () => ssrApi.getScoreHistoryGraph(playerId, leaderboardId),
  });

  if (!scoreHistory || scoreHistory.scores.length <= 1) {
    return (
      <EmptyState
        icon={<ClockIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />}
        title="Not Enough Data"
        description="This score does not have enough data to show a graph"
      />
    );
  }

  const scoreDates = scoreHistory.scores.map(
    (score: ScoreHistoryGraphScore) => new Date(score.timestamp)
  );
  scoreDates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  const firstDate = new Date(scoreDates[0]);
  const lastDate = new Date(scoreDates[scoreDates.length - 1]);

  // Add a small buffer to the date range to ensure we capture all scores
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(23, 59, 59, 999);

  const allDates = generateDateRange(firstDate, lastDate);

  const datasets = [
    ...(!scoreHistory.isRanked
      ? [
          {
            label: "Score",
            data: allDates.map((date: Date) => {
              // Find all scores for this date
              const scoresForDate = scoreHistory.scores.filter((s: ScoreHistoryGraphScore) => {
                const scoreDate = new Date(s.timestamp);
                return scoreDate.toDateString() === date.toDateString();
              });

              // If we have multiple scores, take the highest one
              if (scoresForDate.length > 0) {
                const highestScore = scoresForDate.reduce(
                  (prev: ScoreHistoryGraphScore, current: ScoreHistoryGraphScore) =>
                    current.score > prev.score ? current : prev
                );
                return highestScore.score;
              }
              return null;
            }),
            borderColor: Colors.primary,
            backgroundColor: Colors.primary,
            yAxisID: "y",
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 1,
            pointBorderColor: Colors.primary,
            pointBackgroundColor: Colors.primary,
          },
        ]
      : [
          {
            label: "PP",
            data: allDates.map((date: Date) => {
              // Find all scores for this date
              const scoresForDate = scoreHistory.scores.filter((s: ScoreHistoryGraphScore) => {
                const scoreDate = new Date(s.timestamp);
                return scoreDate.toDateString() === date.toDateString();
              });

              // If we have multiple scores, take the highest one
              if (scoresForDate.length > 0) {
                const highestScore = scoresForDate.reduce(
                  (prev: ScoreHistoryGraphScore, current: ScoreHistoryGraphScore) =>
                    current.pp > prev.pp ? current : prev
                );
                return highestScore.pp;
              }
              return null;
            }),
            borderColor: Colors.ssr,
            backgroundColor: Colors.ssr,
            yAxisID: "y",
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 1,
            pointBorderColor: Colors.ssr,
            pointBackgroundColor: Colors.ssr,
          },
        ]),
    {
      label: "Accuracy",
      data: allDates.map((date: Date) => {
        // Find all scores for this date
        const scoresForDate = scoreHistory.scores.filter((s: ScoreHistoryGraphScore) => {
          const scoreDate = new Date(s.timestamp);
          return scoreDate.toDateString() === date.toDateString();
        });

        // If we have multiple scores, take the highest one
        if (scoresForDate.length > 0) {
          const highestScore = scoresForDate.reduce(
            (prev: ScoreHistoryGraphScore, current: ScoreHistoryGraphScore) =>
              current.accuracy > prev.accuracy ? current : prev
          );
          return highestScore.accuracy;
        }
        return null;
      }),
      borderColor: Colors.generic.green,
      backgroundColor: Colors.generic.green,
      yAxisID: "y1",
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBorderWidth: 1,
      pointBorderColor: Colors.generic.green,
      pointBackgroundColor: Colors.generic.green,
    },
  ];

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: { mode: "index", intersect: false },
    elements: {
      line: {
        spanGaps: true,
      },
    },
    scales: {
      x: {
        grid: { color: "#252525" },
        ticks: {
          color: "white",
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: 10,
          callback: (value: any, index: number) => {
            const date = allDates[index];
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
            const value = allDates[context[0].dataIndex];
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
    <Card className="mb-2 flex w-full flex-col rounded-xl p-3 shadow-xl md:mb-0 md:p-6">
      {/* Compact header */}
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-2">
        <div className="text-muted-foreground text-sm font-medium">
          {formatDate(firstDate, "DD MMMM YYYY")} - {formatDate(lastDate, "DD MMMM YYYY")}
        </div>
        <div className="text-muted-foreground flex flex-col gap-1 text-xs md:flex-row md:gap-4">
          {scoreHistory.isRanked ? (
            <span>
              PP: {Math.min(...scoreHistory.scores.map(s => s.pp)).toFixed(2)} -{" "}
              {Math.max(...scoreHistory.scores.map(s => s.pp)).toFixed(2)}
            </span>
          ) : (
            <span>
              Score: {formatNumberWithCommas(Math.min(...scoreHistory.scores.map(s => s.score)))} -{" "}
              {formatNumberWithCommas(Math.max(...scoreHistory.scores.map(s => s.score)))}
            </span>
          )}
          <span>
            Acc: {Math.min(...scoreHistory.scores.map(s => s.accuracy)).toFixed(2)}% -{" "}
            {Math.max(...scoreHistory.scores.map(s => s.accuracy)).toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="relative flex h-[220px] w-full md:h-[340px]">
        <div className="relative block h-[220px] w-full md:h-[340px]">
          <Line options={options} data={{ labels: allDates, datasets }} />
        </div>
      </div>
    </Card>
  );
}
