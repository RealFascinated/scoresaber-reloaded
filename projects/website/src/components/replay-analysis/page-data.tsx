"use client";

import { FancyLoader } from "@/components/fancy-loader";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Music, Target, XCircle } from "lucide-react";
import { useQueryState } from "nuqs";
import CutDistributionChart from "./charts/cut-distribution-chart";
import HandAccuracyChart from "./charts/hand-accuracy-chart";
import SwingSpeedChart from "./charts/swing-speed-chart";
import { DecodedReplayResponse } from "@ssr/common/types/decoded-replay-response";

type StateCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "default" | "destructive";
};

const StateCard = ({ icon, title, description, variant = "default" }: StateCardProps) => (
  <Card className="flex min-h-[600px] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={`rounded-full p-4 ${variant === "destructive" ? "bg-destructive/10" : "bg-muted"}`}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className={variant === "destructive" ? "text-destructive" : "text-muted-foreground"}>
          {description}
        </p>
      </div>
    </div>
  </Card>
);

const SongInfoCard = ({ data }: { data: DecodedReplayResponse }) => (
  <Card className="h-fit w-full space-y-3">
    {/* Header Section */}
    <div className="flex items-start justify-between gap-4">
      {/* Song Art */}
      <div className="h-20 w-20 overflow-hidden rounded-lg shadow-sm">
        {data.rawReplay.info.hash ? (
          <img
            src={`https://cdn.beatsaver.com/${data.rawReplay.info.hash.toLowerCase()}.jpg`}
            alt={data.rawReplay.info.songName}
            className="h-full w-full object-cover"
            onError={e => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="bg-muted flex h-full w-full items-center justify-center">
            <Music className="text-muted-foreground h-8 w-8" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="min-w-0 flex-1">
        <div className="space-y-1.5">
          {/* Song Name */}
          <h3 className="text-foreground mb-1 line-clamp-2 text-xl leading-tight font-bold">
            {data.rawReplay.info.songName}
          </h3>

          {/* Mapper */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
              <Target className="h-3 w-3" />
              <span className="font-medium">{data.rawReplay.info.mapper}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Player and Difficulty Info */}
    <div className="flex items-center justify-between">
      {/* Player Name */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
          <Target className="h-3 w-3" />
          <span>{data.rawReplay.info.playerName}</span>
        </div>
      </div>

      {/* Difficulty Badge */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 text-xs font-semibold text-white shadow-sm">
          <span>{data.rawReplay.info.difficulty}</span>
        </div>
      </div>
    </div>

    {/* Statistics Grid */}
    <div className="space-y-4">
      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="text-sm font-medium">Final Score</div>
            <div className="text-muted-foreground text-xs">Performance score</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-green-500">
          {data.rawReplay.info.score?.toLocaleString() || "N/A"}
        </div>
      </div>

      {/* Replay Length */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Music className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <div className="text-sm font-medium">Replay Length</div>
            <div className="text-muted-foreground text-xs">Total duration</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-500">
          {data.replayLengthSeconds ? formatTime(data.replayLengthSeconds) : "N/A"}
        </div>
      </div>
    </div>
  </Card>
);

const ChartCard = ({
  title,
  description,
  children,
  icon = <BarChart3 className="h-5 w-5" />,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <Card>
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div className="h-[400px] w-full">{children}</div>
    </div>
  </Card>
);

export default function ReplayAnalysisPageData() {
  const [replayQuery] = useQueryState("replay");

  const { data, isLoading, error } = useQuery({
    queryKey: ["replay", replayQuery],
    queryFn: () => getDecodedReplay(replayQuery!),
    enabled: !!replayQuery,
  });

  if (!replayQuery) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <StateCard
          icon={<BarChart3 className="text-muted-foreground h-8 w-8" />}
          title="No Replay URL Provided"
          description="Please provide a replay URL to analyze your Beat Saber performance."
        />
      </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <FancyLoader
          title="Loading Replay Data"
          description="Decoding and analyzing your replay file..."
        />
      );
    }

    if (error) {
      return (
        <StateCard
          icon={<XCircle className="text-destructive h-8 w-8" />}
          title="Error Loading Replay"
          description={error.message}
          variant="destructive"
        />
      );
    }

    if (!data) {
      return (
        <StateCard
          icon={<BarChart3 className="text-muted-foreground h-8 w-8" />}
          title="No Replay Data Available"
          description="Unable to decode the provided replay file."
        />
      );
    }

    return (
      <>
        <SongInfoCard data={data} />

        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:flex-row">
          <ChartCard
            title="Hand Accuracy Over Time"
            description="Left and right hand accuracy throughout the song."
            icon={<Target className="h-5 w-5" />}
          >
            <HandAccuracyChart replayResponse={data} />
          </ChartCard>

          <ChartCard title="Swing Speed" description="The speed of your swings per hand (in m/s).">
            <SwingSpeedChart replayResponse={data} />
          </ChartCard>

          <ChartCard
            title="Cut Score Distribution"
            description="How often you achieved each cut score."
          >
            <CutDistributionChart cutDistribution={data.cutDistribution} />
          </ChartCard>
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto max-w-[1600px] space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Replay Analysis</h1>
        <p className="text-muted-foreground">Analysis of your Beat Saber performance</p>
      </div>
      {renderContent()}
    </div>
  );
}
