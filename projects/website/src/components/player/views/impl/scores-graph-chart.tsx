import { openInNewTab } from "@/common/browser-utils";
import { applyChartTheme, CHART_THEME, chartTitle } from "@/common/chart/chart-theme";
import { Colors } from "@/common/colors";
import { useRealm } from "@/components/providers/realm-provider";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/contexts/viewport-context";
import { useCanvasColors } from "@/hooks/use-canvas-colors";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { PlayerScoreChartDataPoint } from "@ssr/common/schemas/response/player/scores-chart";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import {
  ActiveElement,
  Chart,
  ChartEvent,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  TooltipItem,
} from "chart.js";
import { useMemo, useState } from "react";
import { Chart as ChartComponent } from "react-chartjs-2";
import PlayerSearch from "../../player-search";

Chart.register(LineController, ScatterController, LineElement, PointElement, LinearScale, Tooltip, Legend);
applyChartTheme();

const TOP_SCORE_COUNT = 500;
const MAX_COMPARISON_PLAYERS = 3;
const STAR_TICK_SIZE = 0.5;
const ACCURACY_TICK_SIZE = 2;

// The chart is drawn as a "line" chart, but its datasets mix line (best/average) and scatter (scores) types
type ChartMode = "line" | "scatter";

type DataPoint = {
  x: number;
  y: number;
  leaderboardId: number;
  leaderboardName: string;
  leaderboardDifficulty: string;
  pp: number;
  timestamp: Date;
};

type ScatterDataset = {
  type: "scatter";
  label: string;
  data: DataPoint[];
  pointRadius: number;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointHoverRadius: number;
  pointHoverBackgroundColor: string;
};

type LineDataset = {
  type: "line";
  label: string;
  data: { x: number; y: number }[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  fill: boolean;
  pointRadius: number;
  tension: number;
};

export default function ScoresGraphChart({ player }: { player: ScoreSaberPlayer }) {
  const { realmId } = useRealm();
  const isMobile = useIsMobile();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ScoreSaberPlayer[]>([]);
  const [showTop, setShowTop] = useState(false);

  const { data: dataPoints, isError } = useQuery({
    queryKey: ["player-scores-chart", player.id, realmId],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerScoresChart(player.id, realmId);
      return scoreChartData?.data || [];
    },
    placeholderData: prev => prev,
  });

  const { data: comparisonData } = useQuery({
    queryKey: ["player-scores-chart-comparison", comparisonPlayers.map(p => p.id), realmId],
    queryFn: async () => {
      const results = await Promise.all(
        comparisonPlayers.map(async p => {
          const scoreChartData = await ssrApi.getPlayerScoresChart(p.id, realmId);
          return { id: p.id, data: scoreChartData?.data || [] };
        })
      );
      return results;
    },
    enabled: comparisonPlayers.length > 0,
    placeholderData: prev => prev,
  });

  // Transform raw API data into chart data points (memoized — the dataset pipeline is the
  // most expensive part of this component and only depends on the query results)
  const { resolve: resolveColor } = useCanvasColors();
  const { hasData, minStar, maxStar, minAccuracy, maxAccuracy, datasets } = useMemo(() => {
    const transformToDataPoints = (rawData: PlayerScoreChartDataPoint[]): DataPoint[] => {
      const transformed = rawData.map(point => ({
        x: point.stars,
        y: point.accuracy,
        leaderboardId: point.leaderboardId,
        leaderboardName: point.leaderboardName,
        leaderboardDifficulty: point.leaderboardDifficulty,
        pp: point.pp,
        timestamp: point.timestamp,
      }));

      if (showTop) {
        return [...transformed].sort((a, b) => (b.pp || 0) - (a.pp || 0)).slice(0, TOP_SCORE_COUNT);
      }

      return transformed;
    };

    const mainPlayerDataPoints = transformToDataPoints(dataPoints || []);

    const comparisonDataPoints = comparisonPlayers.flatMap(comparisonPlayer => {
      const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data || [];
      return transformToDataPoints(playerData);
    });

    const allDataPoints = [...mainPlayerDataPoints, ...comparisonDataPoints];

    const starValues = allDataPoints.map(point => point.x);
    const accuracyValues = allDataPoints.map(point => point.y);

    const minStar =
      starValues.length === 0 ? 0 : Math.floor(Math.min(...starValues) / STAR_TICK_SIZE) * STAR_TICK_SIZE;
    const maxStar =
      starValues.length === 0 ? 0 : Math.ceil(Math.max(...starValues) / STAR_TICK_SIZE) * STAR_TICK_SIZE;
    const minAccuracy =
      accuracyValues.length === 0
        ? 0
        : Math.floor(Math.min(...accuracyValues) / ACCURACY_TICK_SIZE) * ACCURACY_TICK_SIZE;
    const maxAccuracy =
      accuracyValues.length === 0
        ? 0
        : Math.ceil(Math.max(...accuracyValues) / ACCURACY_TICK_SIZE) * ACCURACY_TICK_SIZE;

    const scatterDatasets: ScatterDataset[] = [
      {
        type: "scatter",
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
          type: "scatter",
          label: comparisonPlayer.name,
          data: transformToDataPoints(playerData || []),
          pointRadius: 2,
          pointBackgroundColor: baseColor,
          pointBorderColor: baseColor,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: hoverColor,
        } satisfies ScatterDataset;
      }),
    ];

    // Build best/average line datasets (only when not comparing with other players)
    let lineDatasets: LineDataset[] = [];
    if (comparisonPlayers.length === 0) {
      const groupedByStarRating: Record<number, number[]> = {};
      for (const point of mainPlayerDataPoints) {
        const starGroup = Math.round(point.x / STAR_TICK_SIZE) * STAR_TICK_SIZE;
        if (!groupedByStarRating[starGroup]) {
          groupedByStarRating[starGroup] = [];
        }
        groupedByStarRating[starGroup].push(point.y);
      }

      const bestLineData = Object.entries(groupedByStarRating)
        .map(([stars, accuracies]) => ({
          x: parseFloat(stars),
          y: Math.max(...accuracies),
        }))
        .sort((a, b) => a.x - b.x);

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
          type: "line",
          label: "Best",
          data: bestLineData,
          borderColor: Colors.status.success,
          backgroundColor: `${Colors.status.success}1a`,
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
          tension: 0.1,
        },
        {
          type: "line",
          label: "Average",
          data: averageLineData,
          borderColor: resolveColor(Colors.pp),
          backgroundColor: resolveColor(Colors.pp, 0.1),
          borderWidth: 3,
          fill: false,
          pointRadius: 0,
          tension: 0.1,
        },
      ];
    }

    return {
      hasData: allDataPoints.length > 0,
      minStar,
      maxStar,
      minAccuracy,
      maxAccuracy,
      datasets: {
        datasets: [...lineDatasets, ...scatterDatasets],
      },
    };
  }, [dataPoints, comparisonData, comparisonPlayers, showTop, player.name, resolveColor]);

  const scales = useMemo(
    () => ({
      x: {
        type: "linear" as const,
        min: showTop ? minStar : 0,
        max: maxStar,
        grid: { color: CHART_THEME.gridColor },
        ticks: {
          stepSize: STAR_TICK_SIZE,
          callback: (value: number | string) => {
            const numValue = Number(value);
            return Math.abs((numValue * (1 / STAR_TICK_SIZE)) % 1) < 0.0001 ? numValue : "";
          },
        },
        title: chartTitle("Star Rating"),
      },
      y: {
        type: "linear" as const,
        min: minAccuracy,
        max: showTop ? maxAccuracy : 100,
        grid: { color: CHART_THEME.gridColor },
        ticks: { stepSize: ACCURACY_TICK_SIZE },
        title: chartTitle("Score %"),
      },
    }),
    [showTop, minStar, maxStar, minAccuracy, maxAccuracy]
  );

  const chartOptions = useMemo<ChartOptions<ChartMode>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<ChartMode>) => {
              // Scatter points are always the DataPoint objects built in this component
              const point = context.raw as DataPoint;
              const tooltipLines: string[] = [];

              const mapName = point.leaderboardName || "N/A";
              const difficulty = point.leaderboardDifficulty || "N/A";
              tooltipLines.push(`${mapName} [${difficulty}]`);

              const stars = point.x.toFixed(2);
              const accuracy = point.y.toFixed(2);
              tooltipLines.push(`${stars} ⭐ - ${accuracy}%`);

              if (point.pp !== undefined) {
                tooltipLines.push(`PP: ${formatPp(point.pp)}pp`);
              }

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
        },
      },
      onClick: (_: ChartEvent, elements: ActiveElement[]) => {
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
    }),
    [scales, datasets, isMobile]
  );

  if (isError) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SharedIcons.WarningAlertIcon className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">Failed to load chart data</p>
        </div>
      </div>
    );
  }

  if (!dataPoints) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground text-sm">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground text-sm">No scores found for this player</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-[400px]">
        <ChartComponent<ChartMode> type="line" data={datasets} options={chartOptions} />
      </div>

      <div className="flex flex-col justify-center gap-2 pt-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSearchOpen(true)}
              className="w-full gap-1.5 text-xs font-medium md:w-auto"
              disabled={comparisonPlayers.length >= MAX_COMPARISON_PLAYERS}
            >
              <SharedIcons.ScoresGraphFollowingIcon className="size-4" />
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
                    className="bg-primary/10 border-primary/20 ring-border flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 md:w-auto"
                  >
                    <span className="text-primary-foreground flex-1 md:flex-initial">
                      {comparisonPlayer.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-primary/20 h-5 w-5 shrink-0"
                      onClick={() =>
                        setComparisonPlayers(players => players.filter(p => p.id !== comparisonPlayer.id))
                      }
                    >
                      <SharedIcons.ScoresGraphRemoveIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Switch checked={showTop} onCheckedChange={setShowTop} id="top-mode" />
            <label htmlFor="top-mode" className="text-muted-foreground text-xs font-medium">
              Only Top {TOP_SCORE_COUNT} Scores
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
    </>
  );
}
