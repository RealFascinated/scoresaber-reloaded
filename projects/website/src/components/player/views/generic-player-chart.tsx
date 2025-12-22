"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/api/chart/generic-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { formatDateMinimal, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";
import { useMemo } from "react";

type Props = {
  /**
   * The id of the chart
   */
  id: string;

  /**
   * The player the chart is for
   */
  statisticHistory: PlayerStatisticHistory;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];

  /**
   * The number of days to show in the chart.
   */
  daysAmount?: number;
};

export default function GenericPlayerChart({ id, statisticHistory, datasetConfig, daysAmount = 50 }: Props) {
  const { labels, histories } = useMemo(() => {
    const labels: Date[] = [];
    const histories: Record<string, (number | null)[]> = {};

    // Initialize histories for each dataset with pre-allocated arrays
    datasetConfig.forEach(config => {
      histories[config.field] = new Array(daysAmount).fill(null);
    });

    // Create a map of available data for O(1) lookup
    const dataMap = new Map<string, (typeof statisticHistory)[string]>();
    Object.entries(statisticHistory).forEach(([dateString, history]) => {
      dataMap.set(dateString, history);
    });

    // Determine the end date (prefer today if data exists, otherwise use latest available)
    const today = getMidnightAlignedDate(new Date());
    const todayString = formatDateMinimal(today);
    const hasTodayData = dataMap.has(todayString);

    let endDate: Date;
    if (hasTodayData) {
      endDate = new Date(today);
    } else {
      // Find the latest date from available data
      const dates = Array.from(dataMap.keys()).map(parseDate);
      const latestDate = dates.reduce((latest, current) => (current > latest ? current : latest));
      endDate = getMidnightAlignedDate(latestDate);
    }

    // Calculate start date
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysAmount + 1);

    // Generate all dates and populate data
    for (let i = 0; i < daysAmount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      labels.push(currentDate);

      const dateString = formatDateMinimal(currentDate);
      const history = dataMap.get(dateString);

      datasetConfig.forEach(config => {
        const value = history ? getValueFromHistory(history, config.field) : null;
        histories[config.field][i] = value ?? null;
      });
    }

    return { labels, histories };
  }, [statisticHistory, datasetConfig, daysAmount]);

  // Check if player statistics are available
  if (!statisticHistory || Object.keys(statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>No data available for chart...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="h-[400px] w-full">
        <GenericChart
          config={buildChartConfig({ id, datasetConfig, seriesByField: histories })}
          labels={labels}
        />
      </div>
    </div>
  );
}
