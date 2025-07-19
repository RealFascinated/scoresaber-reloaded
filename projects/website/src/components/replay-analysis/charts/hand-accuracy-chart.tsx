"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { getCutScore } from "@ssr/common/replay/replay-utils";
import { DecodedReplayResponse } from "@ssr/common/types/decoded-replay-response";
import { useMemo } from "react";
import {
  createHandDatasets,
  createTimeChartConfig,
  createTimeLabels,
  getEmptyStateClassName,
} from "./chart-utils";

type Props = {
  replayResponse: DecodedReplayResponse;
};

const HandAccuracyChart = ({ replayResponse }: Props) => {
  const { rawReplay: replay, replayLengthSeconds } = replayResponse;

  const { chartData, labels } = useMemo(() => {
    if (!replay.notes || replay.notes.length === 0) {
      return { chartData: { datasets: [] }, labels: [] };
    }

    const seconds = Math.ceil(replayLengthSeconds);
    const timeLabels: string[] = [];

    // Get cut notes and calculate scores by hand
    const cutNotes = replay.notes.filter(
      note => note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)
    );

    const leftHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 0)
      .map(note => ({ time: note.eventTime, score: getCutScore(note.noteCutInfo!) }));

    const rightHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 1)
      .map(note => ({ time: note.eventTime, score: getCutScore(note.noteCutInfo!) }));

    // Calculate cumulative averages
    const leftHandData: (number | null)[] = [];
    const rightHandData: (number | null)[] = [];

    for (let second = 0; second <= seconds; second++) {
      const leftNotesUpToTime = leftHandScores.filter(note => note.time <= second);
      const rightNotesUpToTime = rightHandScores.filter(note => note.time <= second);

      let hasData = false;

      if (leftNotesUpToTime.length > 0) {
        const averageAccuracy =
          leftNotesUpToTime.reduce((sum, note) => sum + note.score, 0) / leftNotesUpToTime.length;
        leftHandData.push(averageAccuracy);
        hasData = true;
      } else {
        leftHandData.push(null);
      }

      if (rightNotesUpToTime.length > 0) {
        const averageAccuracy =
          rightNotesUpToTime.reduce((sum, note) => sum + note.score, 0) / rightNotesUpToTime.length;
        rightHandData.push(averageAccuracy);
        hasData = true;
      } else {
        rightHandData.push(null);
      }

      if (hasData) {
        timeLabels.push(createTimeLabels(second, 1)[0]);
      }
    }

    return {
      chartData: {
        datasets: createHandDatasets(leftHandData, rightHandData),
      },
      labels: timeLabels,
    };
  }, [replay, replayLengthSeconds]);

  const chartConfig = createTimeChartConfig(
    "hand-accuracy",
    chartData.datasets,
    "Average Accuracy (0-115)"
  );

  if (chartData.datasets.length === 0) {
    return (
      <div className={getEmptyStateClassName()}>
        <p className="text-muted-foreground">No hand accuracy data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default HandAccuracyChart;
