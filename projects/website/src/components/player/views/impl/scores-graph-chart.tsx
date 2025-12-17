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

Chart.register(
  LineController,
  ScatterController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend
);

const MAX_COMPARISON_PLAYERS = 3;
const STAR_TICK_SIZE = 0.5;
const ACCURACY_TICK_SIZE = 2;

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

  // Transform raw API data into chart data points
  const transformToDataPoints = (rawData: any[]): DataPoint[] => {
    const transformed = rawData.map(point => ({
      x: point.stars,
      y: point.accuracy,
      leaderboardId: Number(point.leaderboardId),
      leaderboardName: point.leaderboardName,
      leaderboardDifficulty: point.leaderboardDifficulty,
      pp: point.pp,
      timestamp: point.timestamp,
    }));

    if (showTop100) {
      return [...transformed].sort((a, b) => (b.pp || 0) - (a.pp || 0)).slice(0, 100);
    }

    return transformed;
  };

  // Get main player's data points
  const mainPlayerDataPoints = transformToDataPoints(dataPoints || []);

  // Get comparison players' data points
  const comparisonDataPoints = comparisonPlayers.flatMap(comparisonPlayer => {
    const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data || [];
    return transformToDataPoints(playerData);
  });

  // Combine all data points for scale calculation
  const allDataPoints = [...mainPlayerDataPoints, ...comparisonDataPoints];

  // Calculate axis bounds
  const starValues = allDataPoints.map(point => point.x);
  const accuracyValues = allDataPoints.map(point => point.y);

  const minStar = Math.floor(Math.min(...starValues) / STAR_TICK_SIZE) * STAR_TICK_SIZE;
  const maxStar = Math.ceil(Math.max(...starValues) / STAR_TICK_SIZE) * STAR_TICK_SIZE;
  const minAccuracy =
    Math.floor(Math.min(...accuracyValues) / ACCURACY_TICK_SIZE) * ACCURACY_TICK_SIZE;
  const maxAccuracy =
    Math.ceil(Math.max(...accuracyValues) / ACCURACY_TICK_SIZE) * ACCURACY_TICK_SIZE;

  const scales = {
    x: {
      type: "linear" as const,
      min: showTop100 ? minStar : 0,
      max: maxStar,
      grid: { color: "#252525" },
      ticks: {
        color: "white",
        stepSize: STAR_TICK_SIZE,
        callback: (value: any) => {
          const numValue = Number(value);
          return Math.abs((numValue * (1 / STAR_TICK_SIZE)) % 1) < 0.0001 ? numValue : "";
        },
      },
      title: {
        display: true,
        text: "Star Rating",
        color: "white",
      },
    },
    y: {
      type: "linear" as const,
      min: minAccuracy,
      max: showTop100 ? maxAccuracy : 100,
      grid: { color: "#252525" },
      ticks: { color: "white", stepSize: ACCURACY_TICK_SIZE },
      title: {
        display: true,
        text: "Score %",
        color: "white",
      },
    },
  };

  // Build scatter datasets for main player and comparison players
  const scatterDatasets = [
    {
      type: "scatter" as const,
      label: comparisonPlayers.length === 0 ? "Maps" : player.name,
      data: mainPlayerDataPoints,
      pointRadius: 2,
      pointBackgroundColor: "rgba(255, 255, 255, 0.5)",
      pointBorderColor: "rgba(255, 255, 255, 0.5)",
      pointHoverRadius: 4,
      pointHoverBackgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    ...comparisonPlayers.map((comparisonPlayer, index) => {
      const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data;
      const hue = (index * 137.5) % 360;
      const baseColor = `hsla(${hue}, 85%, 60%, 0.5)`;
      const hoverColor = baseColor.replace("0.5", "0.8");

      return {
        type: "scatter" as const,
        label: comparisonPlayer.name,
        data: transformToDataPoints(playerData || []),
        pointRadius: 2,
        pointBackgroundColor: baseColor,
        pointBorderColor: baseColor,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: hoverColor,
      };
    }),
  ];

  // Build best/average line datasets (only when not comparing with other players)
  let lineDatasets: any[] = [];
  if (comparisonPlayers.length === 0) {
    // Group data points by star rating
    const groupedByStarRating: Record<number, number[]> = {};
    for (const point of mainPlayerDataPoints) {
      const starGroup = Math.round(point.x / STAR_TICK_SIZE) * STAR_TICK_SIZE;
      if (!groupedByStarRating[starGroup]) {
        groupedByStarRating[starGroup] = [];
      }
      groupedByStarRating[starGroup].push(point.y);
    }

    // Create best line data (max accuracy per star rating)
    const bestLineData = Object.entries(groupedByStarRating)
      .map(([stars, accuracies]) => ({
        x: parseFloat(stars),
        y: Math.max(...accuracies),
      }))
      .sort((a, b) => a.x - b.x);

    // Create average line data (average accuracy per star rating)
    const averageLineData = Object.entries(groupedByStarRating)
      .map(([stars, accuracies]) => {
        const sum = accuracies.reduce((total, acc) => total + acc, 0);
        return {
          x: parseFloat(stars),
          y: sum / accuracies.length,
        };
      })
      .sort((a, b) => a.x - b.x);

    lineDatasets = [
      {
        type: "line" as const,
        label: "Best",
        data: bestLineData,
        borderColor: "rgba(0, 255, 127, 0.8)",
        backgroundColor: "rgba(0, 255, 127, 0.1)",
        borderWidth: 3,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        type: "line" as const,
        label: "Average",
        data: averageLineData,
        borderColor: "rgba(0, 123, 255, 0.8)",
        backgroundColor: "rgba(0, 123, 255, 0.1)",
        borderWidth: 3,
        fill: false,
        pointRadius: 0,
        tension: 0.1,
      },
    ];
  }

  const datasets = {
    datasets: [...lineDatasets, ...scatterDatasets],
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
            const point = context.raw;
            const tooltipLines: string[] = [];

            // Map name and difficulty
            const mapName = point.leaderboardName || "N/A";
            const difficulty = point.leaderboardDifficulty || "N/A";
            tooltipLines.push(`${mapName} [${difficulty}]`);

            // Star rating and accuracy
            const stars = point.x.toFixed(2);
            const accuracy = point.y.toFixed(2);
            tooltipLines.push(`${stars} ⭐ - ${accuracy}%`);

            // PP value
            if (point.pp !== undefined) {
              tooltipLines.push(`PP: ${formatPp(point.pp)}pp`);
            }

            // Timestamp
            if (point.timestamp) {
              const dateStr = formatDate(point.timestamp, "Do MMMM, YYYY HH:mm");
              tooltipLines.push(`Played on ${dateStr}`);
            }

            // Click hint (desktop only)
            if (point.leaderboardId && !isMobile) {
              tooltipLines.push("", "Click to view leaderboard!");
            }

            return tooltipLines;
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
      if (isMobile || elements.length === 0) {
        return;
      }

      const clickedElement = elements[0];
      const dataset = datasets.datasets[clickedElement.datasetIndex];
      const clickedPoint = dataset.data[clickedElement.index];

      if (
        clickedPoint &&
        typeof clickedPoint === "object" &&
        "leaderboardId" in clickedPoint &&
        clickedPoint.leaderboardId
      ) {
        const leaderboardUrl = `${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${clickedPoint.leaderboardId}`;
        openInNewTab(leaderboardUrl);
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
      <Card className="bg-chart-card h-[400px] p-2.5">
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
                    <span className="text-primary-foreground flex-1 md:flex-initial">
                      {comparisonPlayer.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-primary/20 h-5 w-5 shrink-0"
                      onClick={() =>
                        setComparisonPlayers(players =>
                          players.filter(p => p.id !== comparisonPlayer.id)
                        )
                      }
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
