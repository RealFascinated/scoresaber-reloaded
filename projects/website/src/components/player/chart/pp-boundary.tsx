"use client";

import { ChartConfig, DatasetConfig } from "@/common/chart/types";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/chart/generic-chart";
import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/stat-value";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

type PpBoundaryProps = {
  player: ScoreSaberPlayer;
};

export default function PpBoundaryStat({ player }: PpBoundaryProps) {
  const boundaries = player.ppBoundaries;
  const histories: Record<string, (number | null)[]> = {};
  const labels: string[] = [];

  for (let boundary = 1; boundary <= boundaries.length + 1; boundary += 1) {
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
      color: Colors.ranked,
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

  const config: ChartConfig = {
    id: "pp-boundary-chart",
    datasets: datasetConfig.map(config => ({
      label: config.title,
      data: histories[config.field],
      color: config.color,
      axisId: config.axisId,
      type: config.type,
      pointRadius: config.pointRadius,
      showLegend: config.showLegend,
      stack: config.stack,
      stackOrder: config.stackOrder,
      labelFormatter: config.labelFormatter,
    })),
    axes: Object.fromEntries(
      datasetConfig.map(config => [
        config.axisId,
        {
          display: config.axisConfig?.display ?? true,
          position: config.axisConfig?.position ?? "left",
          reverse: config.axisConfig?.reverse ?? false,
          displayName: config.axisConfig?.displayName ?? config.title,
          valueFormatter: config.axisConfig?.valueFormatter,
          min: config.axisConfig?.min,
          max: config.axisConfig?.max,
          hideOnMobile: config.axisConfig?.hideOnMobile,
        },
      ])
    ),
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <SimpleTooltip
            display={
              <div className="flex flex-col gap-2 text-center">
                <p>Amount of raw pp required to increase your global pp by 1pp</p>
                <p className="italic">Click to see the graph</p>
              </div>
            }
          >
            <StatValue name={`+1 PP`} value={<p>{boundaries[0].toFixed(2) || "-"}pp</p>} />
          </SimpleTooltip>
        </div>
      </PopoverTrigger>
      <PopoverContent className="flex w-[90vw] flex-col gap-2 p-3 lg:w-[500px]">
        <GenericChart labels={labels} config={config} />
      </PopoverContent>
    </Popover>
  );
}
