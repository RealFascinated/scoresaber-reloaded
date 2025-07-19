"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { getCutScore } from "@ssr/common/replay/replay-utils";
import { DecodedReplayResponse } from "@ssr/common/types/decoded-replay-response";
import { formatTime } from "@ssr/common/utils/time-utils";
import { useMemo } from "react";

type Props = {
  replayResponse: DecodedReplayResponse;
};

const HandAccuracyChart = ({ replayResponse }: Props) => {
  const { rawReplay: replay, replayLengthSeconds } = replayResponse;

  const { chartData, labels } = useMemo(() => {
    if (!replay.notes || replay.notes.length === 0) {
      return {
        chartData: { datasets: [] },
        labels: [],
      };
    }

    // Calculate cumulative average accuracy up to each second for each hand
    const seconds = Math.ceil(replayLengthSeconds);

    const leftHandData: (number | null)[] = [];
    const rightHandData: (number | null)[] = [];
    const timeLabels: string[] = [];

    // Get all cut notes with their scores, separated by hand
    const cutNotes = replay.notes.filter(
      note => note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)
    );

    // Calculate scores for all cut notes, separated by hand
    const leftHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 0) // Left hand
      .map(note => {
        const finalScore = getCutScore(note.noteCutInfo!);

        return {
          time: note.eventTime,
          score: finalScore,
        };
      });

    const rightHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 1) // Right hand
      .map(note => {
        const finalScore = getCutScore(note.noteCutInfo!);

        return {
          time: note.eventTime,
          score: finalScore,
        };
      });

    // Calculate cumulative average for each second, but only add data points when notes are hit
    for (let second = 0; second <= seconds; second++) {
      const leftNotesUpToTime = leftHandScores.filter(note => note.time <= second);
      const rightNotesUpToTime = rightHandScores.filter(note => note.time <= second);

      let hasData = false;

      if (leftNotesUpToTime.length > 0) {
        const totalScore = leftNotesUpToTime.reduce((sum, note) => sum + note.score, 0);
        const averageAccuracy = totalScore / leftNotesUpToTime.length;
        leftHandData.push(averageAccuracy);
        hasData = true;
      } else {
        leftHandData.push(null);
      }

      if (rightNotesUpToTime.length > 0) {
        const totalScore = rightNotesUpToTime.reduce((sum, note) => sum + note.score, 0);
        const averageAccuracy = totalScore / rightNotesUpToTime.length;
        rightHandData.push(averageAccuracy);
        hasData = true;
      } else {
        rightHandData.push(null);
      }

      if (hasData) {
        timeLabels.push(formatTime(second));
      }
    }

    return {
      chartData: {
        datasets: [
          {
            label: "Left Hand",
            data: leftHandData,
            color: "#ef4444",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
          {
            label: "Right Hand",
            data: rightHandData,
            color: "#3b82f6",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
        ],
      },
      labels: timeLabels,
    };
  }, [replay, replayLengthSeconds]);

  const chartConfig: ChartConfig = {
    id: "hand-accuracy",
    datasets: chartData.datasets,
    axes: {
      x: {
        display: true,
        displayName: "Time (seconds)",
        hideOnMobile: false,
        valueFormatter: (value: number) => formatTime(value),
      },
      y: {
        display: true,
        displayName: "Average Accuracy (0-115)",
        hideOnMobile: false,
        position: "left",
        // Let the chart auto-scale to show the important data range
      },
    },
    options: {
      plugins: {
        title: {
          display: false,
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className="border-border bg-muted flex h-[400px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No hand accuracy data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default HandAccuracyChart;
