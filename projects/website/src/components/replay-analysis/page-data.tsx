"use client";

import { Spinner } from "@/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Music, Target, XCircle } from "lucide-react";
import { useQueryState } from "nuqs";
import CutDistributionChart from "./charts/cut-distribution-chart";
import HandAccuracyChart from "./charts/hand-accuracy-chart";

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
        <Card className="flex min-h-[600px] w-full items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <BarChart3 className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Replay URL Provided</h3>
              <p className="text-muted-foreground">
                Please provide a replay URL to analyze your Beat Saber performance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Replay Analysis</h1>
        <p className="text-muted-foreground">Analysis of your Beat Saber performance</p>
      </div>

      {!replayQuery ? (
        <Card className="flex min-h-[600px] w-full items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <BarChart3 className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Replay URL Provided</h3>
              <p className="text-muted-foreground">
                Please provide a replay URL to analyze your Beat Saber performance.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="flex min-h-[600px] w-full items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <Spinner size="lg" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Loading Replay Data</h3>
              <p className="text-muted-foreground">Decoding and analyzing your replay file...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="flex min-h-[600px] w-full items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="bg-destructive/10 rounded-full p-4">
              <XCircle className="text-destructive h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Error Loading Replay</h3>
              <p className="text-destructive">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card className="flex min-h-[600px] w-full items-center justify-center">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="bg-muted rounded-full p-4">
              <BarChart3 className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No Replay Data Available</h3>
              <p className="text-muted-foreground">Unable to decode the provided replay file.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Song Info Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Song Artwork */}
                <div className="flex-shrink-0">
                  <div className="bg-muted h-16 w-16 overflow-hidden rounded-md">
                    {data.rawReplay.info.hash && (
                      <img
                        src={`https://cdn.beatsaver.com/${data.rawReplay.info.hash.toLowerCase()}.jpg`}
                        alt={data.rawReplay.info.songName}
                        className="h-full w-full object-cover"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Song and Player Info */}
                <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="text-muted-foreground h-4 w-4" />
                      <p className="truncate text-lg font-semibold">
                        {data.rawReplay.info.playerName}
                      </p>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Music className="h-3 w-3" />
                      <p className="truncate">{data.rawReplay.info.songName}</p>
                      <span>•</span>
                      <p className="truncate">by {data.rawReplay.info.mapper}</p>
                      <span>•</span>
                      <p className="truncate">{data.rawReplay.info.difficulty}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hand Accuracy Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Hand Accuracy Over Time
              </CardTitle>
              <CardDescription>Left and right hand accuracy throughout the song.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <HandAccuracyChart replay={data.rawReplay} />
              </div>
            </CardContent>
          </Card>

          {/* Cut Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cut Score Distribution
              </CardTitle>
              <CardDescription>How often you achieved each cut score.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <CutDistributionChart cutDistribution={data.cutDistribution} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
