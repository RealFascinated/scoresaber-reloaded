import { openInNewTab } from "@/common/browser-utils";
import { LoadingIcon } from "@/components/loading-icon";
import { Button } from "@/components/ui/button";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
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

const minimumStar = 10;
const maxComparisonPlayers = 3;

// Custom hook for comparison data queries
function useComparisonDataQueries(comparisonPlayers: ScoreSaberPlayer[]) {
  const playerIds = comparisonPlayers.map(player => player.id);

  const queries = useQuery({
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

  return queries;
}

const PlayerScoreChart = ({ player }: PlayerScoreChartProps) => {
  const [accuracyRange, setAccuracyRange] = useState<number[]>([0, 100]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [comparisonPlayers, setComparisonPlayers] = useState<ScoreSaberPlayer[]>([]);

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

  const datasets = {
    datasets: [
      {
        type: "scatter",
        label: player.name,
        data:
          dataPoints?.map(dataPoint => ({
            x: dataPoint.stars,
            y: dataPoint.accuracy,
            leaderboardId: Number(dataPoint.leaderboardId),
            leaderboardName: dataPoint.leaderboardName,
            leaderboardDifficulty: dataPoint.leaderboardDifficulty,
          })) || [],
        pointRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.5)",
        pointBorderColor: "rgba(255, 255, 255, 0.5)",
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "rgba(255, 255, 255, 0.8)",
      },
      ...comparisonPlayers.map((comparisonPlayer, index) => {
        const playerData = comparisonData?.find(d => d.id === comparisonPlayer.id)?.data;
        // Generate distinct colors using HSL color space
        const hue = (index * 137.5) % 360; // Golden angle approximation for even distribution
        return {
          type: "scatter",
          label: comparisonPlayer.name,
          data:
            playerData?.map(dataPoint => ({
              x: dataPoint.stars,
              y: dataPoint.accuracy,
              leaderboardId: Number(dataPoint.leaderboardId),
              leaderboardName: dataPoint.leaderboardName,
              leaderboardDifficulty: dataPoint.leaderboardDifficulty,
            })) || [],
          pointRadius: 2,
          pointBackgroundColor: `hsla(${hue}, 85%, 60%, 0.5)`,
          pointBorderColor: `hsla(${hue}, 85%, 60%, 0.5)`,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: `hsla(${hue}, 85%, 60%, 0.8)`,
        };
      }),
    ],
  };

  const allDataPoints = [...(dataPoints || []), ...(comparisonData || []).flatMap(d => d.data)];

  const highestStar = Math.ceil(
    allDataPoints.length > 0
      ? Math.max(minimumStar, Math.max(...allDataPoints.map(point => point.stars)))
      : minimumStar
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
        display: true,
        position: "top",
        labels: {
          color: "white",
        },
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
    <div className="flex justify-center flex-col gap-6">
      <div className="flex flex-wrap gap-2 items-center">
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
            className="flex items-center gap-2 bg-accent px-3 py-1 rounded-md"
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
      {(!dataPoints || isComparisonLoading) && (
        <div className="h-[500px] flex items-center justify-center">
          <LoadingIcon />
        </div>
      )}
    </div>
  );
};

export default PlayerScoreChart;
