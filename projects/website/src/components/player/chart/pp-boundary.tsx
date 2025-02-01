"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatValue from "@/components/stat-value";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Tooltip from "@/components/tooltip";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import GenericChart from "@/components/chart/generic-chart";
import { DatasetConfig } from "@/common/chart/types";

type PpBoundaryProps = {
  player: ScoreSaberPlayer;
};

const boundariesCount = 100;

export default function PpBoundaryStat({ player }: PpBoundaryProps) {
  const boundaries = player.ppBoundaries;
  const histories: Record<string, (number | null)[]> = {};
  const labels: string[] = [];

  for (let boundary = 1; boundary <= boundariesCount + 1; boundary += 1) {
    const label = `+${boundary}pp`;
    labels.push(label);

    const history = histories["pp"];
    if (!history) {
      histories["pp"] = [];
    }
    histories["pp"].push(boundaries[boundary - 1]);
  }

  const datasetConfig: DatasetConfig[] = [
    {
      title: "Global PP Gain",
      field: "pp",
      color: "#3EC1D3",
      axisId: "y",
      axisConfig: {
        reverse: false,
        display: true,
        displayName: "PP",
        position: "left",
      },
      labelFormatter: (value: number) => `${value.toFixed(2)}pp`,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <Tooltip
            asChild={false}
            display={
              <div className="text-center flex flex-col gap-2">
                <p>Amount of raw pp required to increase your global pp by 1pp</p>
                <p className="italic">Click to see the graph</p>
              </div>
            }
          >
            <StatValue name={`+1 PP`} value={<p>{boundaries[0].toFixed(2) || "-"}pp</p>} />
          </Tooltip>
        </div>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-2 p-3 w-[90vw] lg:w-[500px]">
        <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />
      </PopoverContent>
    </Popover>
  );
}
