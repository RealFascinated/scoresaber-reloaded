"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/api/chart/generic-chart-dynamic";
import {
  ScoreSaberPlayerHistory,
  ScoreSaberPlayerHistoryEntries,
} from "@ssr/common/schemas/scoresaber/player/history";
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
  statisticHistory: ScoreSaberPlayerHistoryEntries;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];

  /**
   * The number of days to show in the chart. Use `-1` for all stored history.
   */
  daysAmount?: number;
};

export default function GenericPlayerChart({ id, statisticHistory, datasetConfig, daysAmount = 50 }: Props) {
  const { labels, histories } = useMemo(() => {
    const histories: Record<string, (number | null)[]> = {};

    // Create a map of available data for O(1) lookup
    const dataMap = new Map<string, ScoreSaberPlayerHistory>();
    Object.entries(statisticHistory).forEach(([dateString, history]) => {
      dataMap.set(dateString, history);
    });

    const allTime = daysAmount === -1;

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

    // Generate label dates: sliding window or every day we have data (all-time)
    const labelsResult: Date[] = [];
    if (allTime) {
      const sortedKeys = Array.from(dataMap.keys()).sort(
        (a, b) => parseDate(a).getTime() - parseDate(b).getTime()
      );
      for (const key of sortedKeys) {
        labelsResult.push(getMidnightAlignedDate(parseDate(key)));
      }
    } else {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysAmount + 1);
      for (let i = 0; i < daysAmount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        labelsResult.push(currentDate);
      }
    }

    datasetConfig.forEach(config => {
      histories[config.field] = labelsResult.map(currentDate => {
        const dateString = formatDateMinimal(currentDate);
        const history = dataMap.get(dateString);
        const value = history
          ? getValueFromHistory(history, config.field as keyof ScoreSaberPlayerHistory)
          : null;
        return value ?? null;
      });
    });

    return { labels: labelsResult, histories };
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
