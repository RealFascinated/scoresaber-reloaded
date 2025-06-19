import { openInNewTab } from "@/common/browser-utils";
import { cn } from "@/common/utils";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

Chart.register(
  LineController,
  ScatterController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend
);

// Constants
const MINIMUM_STAR = 10;
const MAX_COMPARISON_PLAYERS = 3;

// Types
type DataPoint = {
  x: number;
  y: number;
  leaderboardId: number;
  leaderboardName: string;
  leaderboardDifficulty: string;
  pp: number;
  timestamp: Date;
};

type ChartLines = {
  bestLine: { x: number; y: number }[];
  averageLine: { x: number; y: number }[];
};

// Utility functions
const mapDataPoint = (dataPoint: any): DataPoint => ({
  x: dataPoint.stars,
  y: dataPoint.accuracy,
  leaderboardId: Number(dataPoint.leaderboardId),
  leaderboardName: dataPoint.leaderboardName,
  leaderboardDifficulty: dataPoint.leaderboardDifficulty,
  pp: dataPoint.pp,
  timestamp: dataPoint.timestamp,
});

const filterTop100 = (points: any[], showTop100: boolean): DataPoint[] => {
  if (!showTop100) return points.map(mapDataPoint);
  return [...points]
    .sort((a, b) => (b.pp || 0) - (a.pp || 0))
    .slice(0, 100)
    .map(mapDataPoint);
};

const createDataset = (data: any[], label: string, color: string, showTop100: boolean) => ({
  type: "scatter" as const,
  label,
  data: filterTop100(data, showTop100),
  pointRadius: 2,
  pointBackgroundColor: color,
  pointBorderColor: color,
  pointHoverRadius: 4,
  pointHoverBackgroundColor: color.replace("0.5", "0.8"),
});

const createLineDataset = (data: any[], label: string, color: string) => ({
  type: "line" as const,
  label,
  data,
  borderColor: color,
  backgroundColor: color.replace("0.5", "0.1"),
  borderWidth: 3,
  fill: false,
  pointRadius: 0,
  tension: 0.1,
});

const getComparisonPlayerColor = (index: number): string => {
  const hue = (index * 137.5) % 360;
  return `hsla(${hue}, 85%, 60%, 0.5)`;
};

const calculateBestAndAverageLines = (dataPoints: any[], showTop100: boolean): ChartLines => {
  if (!dataPoints?.length) return { bestLine: [], averageLine: [] };

  const filteredData = filterTop100(dataPoints, showTop100);
  const groupedByStars = filteredData.reduce(
    (acc, point) => {
      const starGroup = Math.round(point.x * 2) / 2;
      if (!acc[starGroup]) acc[starGroup] = [];
      acc[starGroup].push(point.y);
      return acc;
    },
    {} as Record<number, number[]>
  );

  const processLines = (aggregateFn: (values: number[]) => number) =>
    Object.entries(groupedByStars)
      .map(([stars, accuracies]) => ({
        x: parseFloat(stars),
        y: aggregateFn(accuracies),
      }))
      .sort((a, b) => a.x - b.x);

  return {
    bestLine: processLines(accuracies => Math.max(...accuracies)),
    averageLine: processLines(
      accuracies => accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
    ),
  };
};

const calculateChartScales = (visibleDataPoints: DataPoint[], showTop100: boolean) => {
  const highestStar = Math.ceil(Math.max(MINIMUM_STAR, ...visibleDataPoints.map(point => point.x)));
  const lowestStar = Math.floor(Math.min(...visibleDataPoints.map(point => point.x)));
  const highestAcc = Math.ceil(Math.max(...visibleDataPoints.map(point => point.y)));
  const lowestAcc = Math.floor(Math.min(...visibleDataPoints.map(point => point.y)));

  return {
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
      min: showTop100 ? lowestAcc : 0,
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
};

const createChartOptions = (
  datasets: any,
  onDataPointClick: (leaderboardId: number) => void,
  scales: any
): ChartOptions => ({
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
          if (dataPoint.leaderboardId) {
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
  onClick: (event: any, elements: any[]) => {
    if (elements.length > 0) {
      const dataPoint = datasets.datasets[elements[0].datasetIndex].data[elements[0].index];
      if (dataPoint?.leaderboardId) {
        onDataPointClick(dataPoint.leaderboardId);
      }
    }
  },
});

export default function MapsGraphChart({ player }: { player: ScoreSaberPlayer }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ScoreSaberPlayer[]>([]);
  const [showTop100, setShowTop100] = useState(false);

  const { data: dataPoints } = useQuery({
    queryKey: ["player-maps-graph", player.id],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerMapsGraphData(player.id);
      return scoreChartData?.data || [];
    },
    placeholderData: prev => prev,
  });

  const { data: comparisonData, isLoading: isComparisonLoading } = useQuery({
    queryKey: ["player-maps-graph-comparison", comparisonPlayers.map(p => p.id)],
    queryFn: async () => {
      const results = await Promise.all(
        comparisonPlayers.map(async p => {
          const scoreChartData = await ssrApi.getPlayerMapsGraphData(p.id);
          return { id: p.id, data: scoreChartData?.data || [] };
        })
      );
      return results;
    },
    enabled: comparisonPlayers.length > 0,
    placeholderData: prev => prev,
  });

  const handleAddComparisonPlayer = (newPlayer: ScoreSaberPlayer) => {
    if (
      !comparisonPlayers.find(p => p.id === newPlayer.id) &&
      comparisonPlayers.length < MAX_COMPARISON_PLAYERS
    ) {
      setComparisonPlayers([...comparisonPlayers, newPlayer]);
    }
  };

  const handleRemoveComparisonPlayer = (playerId: string) => {
    setComparisonPlayers(players => players.filter(p => p.id !== playerId));
  };

  const visibleDataPoints = showTop100
    ? [
        ...filterTop100(dataPoints || [], showTop100),
        ...comparisonPlayers.flatMap(p => {
          const playerData = comparisonData?.find(d => d.id === p.id)?.data || [];
          return filterTop100(playerData, showTop100);
        }),
      ]
    : [...(dataPoints || []), ...(comparisonData || []).flatMap(d => d.data)].map(mapDataPoint);

  const { bestLine, averageLine } =
    comparisonPlayers.length === 0
      ? calculateBestAndAverageLines(dataPoints || [], showTop100)
      : { bestLine: [], averageLine: [] };

  const datasets = {
    datasets: [
      createDataset(
        dataPoints || [],
        comparisonPlayers.length === 0 ? "Maps" : player.name,
        "rgba(255, 255, 255, 0.5)",
        showTop100
      ),
      ...comparisonPlayers.map((comparisonPlayer, index) => {
        const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data;
        return createDataset(
          playerData || [],
          comparisonPlayer.name,
          getComparisonPlayerColor(index),
          showTop100
        );
      }),
      ...(comparisonPlayers.length === 0
        ? [
            createLineDataset(bestLine, "Best", "rgba(0, 255, 127, 0.8)"),
            createLineDataset(averageLine, "Average", "rgba(0, 123, 255, 0.8)"),
          ]
        : []),
    ],
  };

  const scales = calculateChartScales(visibleDataPoints, showTop100);
  const options = createChartOptions(
    datasets,
    leaderboardId => openInNewTab(`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`),
    scales
  );

  if (!dataPoints || isComparisonLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-border/50 bg-background/50 h-[450px] rounded-lg border p-4">
        <Line data={datasets as any} options={options as any} />
      </div>

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
                    <span className="text-primary-foreground flex-1 md:flex-initial">
                      {comparisonPlayer.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-primary/20 h-5 w-5 shrink-0"
                      onClick={() => handleRemoveComparisonPlayer(comparisonPlayer.id)}
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
          onPlayerSelect={handleAddComparisonPlayer}
          placeholder="Search for a player to compare..."
          excludePlayerIds={[player.id, ...comparisonPlayers.map(p => p.id)]}
        />
      </div>
    </div>
  );
}
