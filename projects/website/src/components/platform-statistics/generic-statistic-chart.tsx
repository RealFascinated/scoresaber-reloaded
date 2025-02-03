"use client";

import React from "react";
import { getDaysAgoDate, parseDate } from "@ssr/common/utils/time-utils";
import { StatisticsType } from "@ssr/common/model/statistics/statistic-type";
import { Statistic } from "@ssr/common/model/statistics/statistic";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";

type Props = {
  /**
   * The player the chart is for
   */
  statistics: StatisticsType;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];
};

export default function GenericStatisticChart({ statistics, datasetConfig }: Props) {
  const histories: Record<string, (number | null)[]> = {};
  const historyDays = 365;

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  const labels: Date[] = [];

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(statistics).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  let currentHistoryIndex = 0;

  for (let dayAgo = historyDays; dayAgo >= 1; dayAgo--) {
    // skip the current day
    const targetDate = getDaysAgoDate(dayAgo);
    labels.push(targetDate); // Add the target date to labels

    if (currentHistoryIndex < statisticEntries.length) {
      const [dateString, history] = statisticEntries[currentHistoryIndex];
      const entryDate = parseDate(dateString);

      if (entryDate.toDateString() === targetDate.toDateString()) {
        datasetConfig.forEach(config => {
          histories[config.field][historyDays - dayAgo] = history[config.field as Statistic] ?? null;
        });
        currentHistoryIndex++;
      }
    }
  }

  let showNoData = false;
  if (datasetConfig.length === 1) {
    for (const dataset of datasetConfig) {
      const containsData = histories[dataset.field].some(value => value !== null);
      if (!containsData) {
        showNoData = true;
        break;
      }
    }
  }

  // Render the chart with collected data
  return (
    <div className="flex relative">
      {showNoData ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-[9999] bg-muted p-2 rounded-md">
          <p className="text-red-500">No data available</p>
        </div>
      ) : null}
      <div className="w-full h-full">
        <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
      </div>
    </div>
  );
}
