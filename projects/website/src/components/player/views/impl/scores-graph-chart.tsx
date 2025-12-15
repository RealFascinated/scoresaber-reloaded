import { openInNewTab } from "@/common/browser-utils";
import { cn } from "@/common/utils";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/contexts/viewport-context";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import {
  Chart,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";
import { Users, X } from "lucide-react";
import { useState } from "react";
import { Line } from "react-chartjs-2";
import PlayerSearch from "../../player-search";

Chart.register(LineController, ScatterController, LineElement, PointElement, LinearScale, Tooltip, Legend);

const MINIMUM_STAR = 10;
const MAX_COMPARISON_PLAYERS = 3;

type DataPoint = {
  x: number;
  y: number;
  leaderboardId: number;
  leaderboardName: string;
  leaderboardDifficulty: string;
  pp: number;
  timestamp: Date;
};

export default function ScoresGraphChart({ player }: { player: ScoreSaberPlayer }) {
  const isMobile = useIsMobile();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ScoreSaberPlayer[]>([]);
  const [showTop100, setShowTop100] = useState(false);

  const { data: dataPoints } = useQuery({
    queryKey: ["player-maps-graph", player.id],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerScoresChart(player.id);
      return scoreChartData?.data || [];
    },
    placeholderData: prev => prev,
  });

  const { data: comparisonData, isLoading: isComparisonLoading } = useQuery({
    queryKey: ["player-maps-graph-comparison", comparisonPlayers.map(p => p.id)],
    queryFn: async () => {
      const results = await Promise.all(
        comparisonPlayers.map(async p => {
          const scoreChartData = await ssrApi.getPlayerScoresChart(p.id);
          return { id: p.id, data: scoreChartData?.data || [] };
        })
      );
      return results;
    },
    enabled: comparisonPlayers.length > 0,
    placeholderData: prev => prev,
  });

  // Process all data points
  const processDataPoints = (rawData: any[]): DataPoint[] => {
    const mapped = rawData.map(point => ({
      x: point.stars,
      y: point.accuracy,
      leaderboardId: Number(point.leaderboardId),
      leaderboardName: point.leaderboardName,
      leaderboardDifficulty: point.leaderboardDifficulty,
      pp: point.pp,
      timestamp: point.timestamp,
    }));

    if (!showTop100) return mapped;

    return [...mapped].sort((a, b) => (b.pp || 0) - (a.pp || 0)).slice(0, 100);
  };

  // Get all visible data points for scale calculation
  const allDataPoints = [
    ...processDataPoints(dataPoints || []),
    ...comparisonPlayers.flatMap(p => {
      const playerData = comparisonData?.find(d => d.id === p.id)?.data || [];
      return processDataPoints(playerData);
    }),
  ];

  // Calculate chart scales
  const highestStar = Math.ceil(Math.max(MINIMUM_STAR, ...allDataPoints.map(point => point.x)));
  const lowestStar = Math.floor(Math.min(...allDataPoints.map(point => point.x)));
  const highestAcc = Math.ceil(Math.max(...allDataPoints.map(point => point.y)));
  const lowestAcc = Math.floor(Math.min(...allDataPoints.map(point => point.y)));

  const scales = {
    x: {
      type: "linear" as const,
      min: showTop100 ? lowestStar : 0,
      max: highestStar,
      grid: { color: "#252525" },
      ticks: {
        color: "white",
        stepSize: 1,
        callback: (value: any) => (value % 1 === 0 ? value : ""),
      },
      title: {
        display: true,
        text: "Star Rating",
        color: "white",
      },
    },
    y: {
      type: "linear" as const,
      min: lowestAcc,
      max: showTop100 ? highestAcc : 100,
      grid: { color: "#252525" },
      ticks: { color: "white" },
      title: {
        display: true,
        text: "Score %",
        color: "white",
      },
    },
  };

  // Create datasets
  const datasets = {
    datasets: [
      {
        type: "scatter" as const,
        label: comparisonPlayers.length === 0 ? "Maps" : player.name,
        data: processDataPoints(dataPoints || []),
        pointRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.5)",
        pointBorderColor: "rgba(255, 255, 255, 0.5)",
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "rgba(255, 255, 255, 0.8)",
      },
      ...comparisonPlayers.map((comparisonPlayer, index) => {
        const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data;
        const hue = (index * 137.5) % 360;
        const color = `hsla(${hue}, 85%, 60%, 0.5)`;

        return {
          type: "scatter" as const,
          label: comparisonPlayer.name,
          data: processDataPoints(playerData || []),
          pointRadius: 2,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color.replace("0.5", "0.8"),
        };
      }),
      // Add best/average lines only when no comparison players
      ...(comparisonPlayers.length === 0
        ? (() => {
            const processedData = processDataPoints(dataPoints || []);
            const groupedByStars = processedData.reduce(
              (acc, point) => {
                const starGroup = Math.round(point.x * 2) / 2;
                if (!acc[starGroup]) acc[starGroup] = [];
                acc[starGroup].push(point.y);
                return acc;
              },
              {} as Record<number, number[]>
            );

            const createLine = (aggregateFn: (values: number[]) => number, label: string, color: string) => {
              const lineData = Object.entries(groupedByStars)
                .map(([stars, accuracies]) => ({
                  x: parseFloat(stars),
                  y: aggregateFn(accuracies),
                }))
                .sort((a, b) => a.x - b.x);

              return {
                type: "line" as const,
                label,
                data: lineData,
                borderColor: color,
                backgroundColor: color.replace("0.8", "0.1"),
                borderWidth: 3,
                fill: false,
                pointRadius: 0,
                tension: 0.1,
              };
            };

            return [
              createLine(accuracies => Math.max(...accuracies), "Best", "rgba(0, 255, 127, 0.8)"),
              createLine(
                accuracies => accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length,
                "Average",
                "rgba(0, 123, 255, 0.8)"
              ),
            ];
          })()
        : []),
    ],
  };

  const chartOptions: ChartOptions = {
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    scales,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const dataPoint = context.raw;
            const lines = [
              `${dataPoint.leaderboardName || "N/A"} [${dataPoint.leaderboardDifficulty || "N/A"}]`,
              `${dataPoint.x.toFixed(2)} ⭐ - ${dataPoint.y.toFixed(2)}%`,
            ];

            if (dataPoint.pp !== undefined) {
              lines.push(`PP: ${formatPp(dataPoint.pp)}pp`);
            }
            if (dataPoint.timestamp) {
              lines.push(`Played on ${formatDate(dataPoint.timestamp, "Do MMMM, YYYY HH:mm")}`);
            }
            if (dataPoint.leaderboardId && !isMobile) {
              lines.push("", "Click to view leaderboard!");
            }

            return lines;
          },
        },
      },
      legend: {
        display: true,
        position: "top" as const,
        labels: { color: "white" },
      },
    },
    onClick: (_, elements: any[]) => {
      if (isMobile) return;
      if (elements.length > 0) {
        const dataPoint = datasets.datasets[elements[0].datasetIndex].data[elements[0].index];
        if (dataPoint && "leaderboardId" in dataPoint && dataPoint.leaderboardId) {
          openInNewTab(`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${dataPoint.leaderboardId}`);
        }
      }
    },
  };

  if (!dataPoints || isComparisonLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="h-[400px] p-2.5">
        <Line data={datasets as any} options={chartOptions as any} />
      </Card>

      <div className="space-y-3">
        <div
          className={cn("flex flex-col gap-4", {
            "md:flex-row md:items-center md:justify-between": true,
          })}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Button
              variant="outline"
              onClick={() => setIsSearchOpen(true)}
              className="w-full text-sm font-medium md:w-auto"
              disabled={comparisonPlayers.length >= MAX_COMPARISON_PLAYERS}
            >
              <Users className="mr-2 h-4 w-4" />
              Add Player to Compare
              {comparisonPlayers.length > 0 && (
                <span className="bg-primary/10 ml-2 rounded-full px-2 py-0.5 text-xs">
                  {comparisonPlayers.length}/{MAX_COMPARISON_PLAYERS}
                </span>
              )}
            </Button>

            {comparisonPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {comparisonPlayers.map(comparisonPlayer => (
                  <div
                    key={comparisonPlayer.id}
                    className="bg-primary/10 border-primary/20 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium md:w-auto"
                  >
                    <span className="text-primary-foreground flex-1 md:flex-initial">{comparisonPlayer.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-primary/20 h-5 w-5 shrink-0"
                      onClick={() => setComparisonPlayers(players => players.filter(p => p.id !== comparisonPlayer.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Switch checked={showTop100} onCheckedChange={setShowTop100} id="top100-mode" />
            <label htmlFor="top100-mode" className="text-muted-foreground text-sm font-medium">
              Only Top 100 Scores
            </label>
          </div>
        </div>

        <PlayerSearch
          isOpen={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          onPlayerSelect={newPlayer => {
            if (
              !comparisonPlayers.find(p => p.id === newPlayer.id) &&
              comparisonPlayers.length < MAX_COMPARISON_PLAYERS
            ) {
              setComparisonPlayers([...comparisonPlayers, newPlayer]);
            }
          }}
          placeholder="Search for a player to compare..."
          excludePlayerIds={[player.id, ...comparisonPlayers.map(p => p.id)]}
        />
      </div>
    </div>
  );
}
