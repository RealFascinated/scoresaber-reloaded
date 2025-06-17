import { openInNewTab } from "@/common/browser-utils";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Switch } from "@/components/ui/switch";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { Chart, ChartOptions, registerables } from "chart.js";
import { X } from "lucide-react";
import { useState } from "react";
import { Line } from "react-chartjs-2";
import PlayerSearch from "../player-search";

Chart.register(...registerables);

type PlayerScoreChartProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

type DataPoint = {
  x: number;
  y: number;
  leaderboardId: number;
  leaderboardName: string;
  leaderboardDifficulty: string;
  pp: number;
  timestamp: Date;
};

const minimumStar = 10;
const maxComparisonPlayers = 3;

// Custom hook for comparison data queries
function useComparisonDataQueries(comparisonPlayers: ScoreSaberPlayer[]) {
  const playerIds = comparisonPlayers.map(player => player.id);

  return useQuery({
    queryKey: ["player-score-chart-comparison", playerIds],
    queryFn: async () => {
      const results = await Promise.all(
        playerIds.map(async id => {
          const scoreChartData = await ssrApi.getPlayerScoreChartData(id);
          return {
            id,
            data: scoreChartData?.data || [],
          };
        })
      );
      return results;
    },
    enabled: playerIds.length > 0,
  });
}

const PlayerScoreChart = ({ player }: PlayerScoreChartProps) => {
  const [accuracyRange, setAccuracyRange] = useState<number[]>([0, 100]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ScoreSaberPlayer[]>([]);
  const [showTop100, setShowTop100] = useState(false);

  const { data: dataPoints } = useQuery({
    queryKey: ["player-score-chart", player.id],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerScoreChartData(player.id);
      return scoreChartData?.data || [];
    },
  });

  const { data: comparisonData, isLoading: isComparisonLoading } =
    useComparisonDataQueries(comparisonPlayers);

  const addComparisonPlayer = (player: ScoreSaberPlayer) => {
    if (
      !comparisonPlayers.find(p => p.id === player.id) &&
      comparisonPlayers.length < maxComparisonPlayers
    ) {
      setComparisonPlayers([...comparisonPlayers, player]);
    }
  };

  const removeComparisonPlayer = (playerId: string) => {
    setComparisonPlayers(comparisonPlayers.filter(p => p.id !== playerId));
  };

  /**
   * Callback for when a data point is clicked.
   *
   * @param leaderboardId
   */
  const onDataPointClick = (leaderboardId: number) => {
    openInNewTab(`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`);
  };

  const mapDataPoint = (dataPoint: any): DataPoint => ({
    x: dataPoint.stars,
    y: dataPoint.accuracy,
    leaderboardId: Number(dataPoint.leaderboardId),
    leaderboardName: dataPoint.leaderboardName,
    leaderboardDifficulty: dataPoint.leaderboardDifficulty,
    pp: dataPoint.pp,
    timestamp: dataPoint.timestamp,
  });

  const filterTop100 = (points: any[]): DataPoint[] => {
    if (!showTop100) return points.map(mapDataPoint);
    return [...points]
      .sort((a, b) => (b.pp || 0) - (a.pp || 0))
      .slice(0, 100)
      .map(mapDataPoint);
  };

  const createDataset = (data: any[], label: string, color: string) => ({
    type: "scatter" as const,
    label,
    data: filterTop100(data),
    pointRadius: 2,
    pointBackgroundColor: color,
    pointBorderColor: color,
    pointHoverRadius: 4,
    pointHoverBackgroundColor: color.replace("0.5", "0.8"),
  });

  const datasets = {
    datasets: [
      createDataset(dataPoints || [], player.name, "rgba(255, 255, 255, 0.5)"),
      ...comparisonPlayers.map((comparisonPlayer, index) => {
        const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data;
        const hue = (index * 137.5) % 360;
        const color = `hsla(${hue}, 85%, 60%, 0.5)`;
        return createDataset(playerData || [], comparisonPlayer.name, color);
      }),
    ],
  };

  const visibleDataPoints = showTop100
    ? [
        ...filterTop100(dataPoints || []),
        ...comparisonPlayers.flatMap(player => {
          const playerData = comparisonData?.find(d => d.id === player.id)?.data || [];
          return filterTop100(playerData);
        }),
      ]
    : [...(dataPoints || []), ...(comparisonData || []).flatMap(d => d.data)].map(mapDataPoint);

  const highestStar = Math.ceil(
    visibleDataPoints.length > 0
      ? Math.max(minimumStar, Math.max(...visibleDataPoints.map(point => point.x)))
      : minimumStar
  );

  const lowestStar = Math.floor(
    visibleDataPoints.length > 0 ? Math.min(...visibleDataPoints.map(point => point.x)) : 0
  );

  const highestAcc = Math.ceil(
    visibleDataPoints.length > 0 ? Math.max(...visibleDataPoints.map(point => point.y)) : 100
  );

  const lowestAcc = Math.floor(
    visibleDataPoints.length > 0 ? Math.min(...visibleDataPoints.map(point => point.y)) : 0
  );

  const options: ChartOptions = {
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        min: showTop100 ? lowestStar : 0,
        max: highestStar,
        grid: { color: "#252525" },
        ticks: { color: "white" },
        title: {
          display: true,
          text: "Star Rating",
          color: "white",
        },
      },
      y: {
        type: "linear",
        min: showTop100 ? lowestAcc : accuracyRange[0],
        max: showTop100 ? highestAcc : accuracyRange[1],
        grid: { color: "#252525" },
        ticks: { color: "white" },
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
              `PP: ${formatPp(dataPoint.pp)}pp`,
              `Played on ${formatDate(dataPoint.timestamp, "Do MMMM, YYYY HH:mm")}`,
              "",
              "Click to view leaderboard!",
            ];
          },
        },
      },
      legend: {
        display: true,
        position: "top",
        labels: { color: "white" },
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const datasetIndex = elements[0].datasetIndex;
        const dataPoint = datasets.datasets[datasetIndex].data[dataIndex];
        if (dataPoint) {
          onDataPointClick(dataPoint.leaderboardId);
        }
      }
    },
  };

  return (
    <div className="flex flex-col justify-center gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsSearchOpen(true)}
          className="text-sm"
          disabled={comparisonPlayers.length >= maxComparisonPlayers}
        >
          Add Player to Compare{" "}
          {comparisonPlayers.length > 0 && `(${comparisonPlayers.length}/${maxComparisonPlayers})`}
        </Button>
        {comparisonPlayers.map(comparisonPlayer => (
          <div
            key={comparisonPlayer.id}
            className="bg-accent flex items-center gap-2 rounded-md px-3 py-1"
          >
            <span className="text-sm">{comparisonPlayer.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => removeComparisonPlayer(comparisonPlayer.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={showTop100} onCheckedChange={setShowTop100} id="top100-mode" />
        <label htmlFor="top100-mode" className="text-muted-foreground text-sm">
          Only Top 100 Scores
        </label>
      </div>

      <PlayerSearch
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onPlayerSelect={addComparisonPlayer}
        placeholder="Search for a player to compare..."
        excludePlayerIds={[player.id, ...comparisonPlayers.map(p => p.id)]}
      />

      {dataPoints && !isComparisonLoading && (
        <>
          <div className="h-[500px]">
            <Line className="max-w-[100%]" data={datasets as any} options={options as any} />
          </div>
          {!showTop100 && (
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
          )}
        </>
      )}
      {(!dataPoints || isComparisonLoading) && (
        <div className="flex h-[500px] items-center justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default PlayerScoreChart;
