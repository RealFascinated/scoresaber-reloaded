"use client";

import Card from "@/components/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Score from "@/components/score/score";
import { useEffect, useState } from "react";
import { Timeframe } from "@ssr/common/timeframe";
import { TopScoresResponse } from "@ssr/common/response/top-scores-response";
import { Config } from "@ssr/common/config";
import { kyFetch } from "@ssr/common/utils/utils";
import { useQuery } from "@tanstack/react-query";
import { LoadingIcon } from "@/components/loading-icon";
import { capitalizeFirstLetter } from "@/common/string-utils";

type TimeframesType = {
  timeframe: Timeframe;
  display: string;
};
const timeframes: TimeframesType[] = [
  {
    timeframe: "daily",
    display: "Today",
  },
  {
    timeframe: "weekly",
    display: "This Week",
  },
  {
    timeframe: "monthly",
    display: "This Month",
  },
];

type TopScoresDataProps = {
  timeframe: Timeframe;
};

export function TopScoresData({ timeframe }: TopScoresDataProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);
  const [scores, setScores] = useState<TopScoresResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["top-scores", selectedTimeframe],
    queryFn: async () => {
      return kyFetch<TopScoresResponse>(`${Config.apiUrl}/scores/top?limit=50&timeframe=${selectedTimeframe}`);
    },
  });

  useEffect(() => {
    // Update the URL
    window.history.replaceState(null, "", `/scores/top/${selectedTimeframe}`);
  }, [selectedTimeframe]);

  useEffect(() => {
    if (data) {
      setScores(data);
    }
  }, [data]);

  return (
    <Card className="flex flex-col gap-2 w-full xl:w-[75%] justify-center">
      <div className="flex flex-row flex-wrap gap-2 justify-center">
        {timeframes.map((timeframe, index) => {
          return (
            <Button
              key={index}
              className="w-32"
              variant={selectedTimeframe === timeframe.timeframe ? "default" : "outline"}
              onClick={() => {
                setScores(null);
                setSelectedTimeframe(timeframe.timeframe);
              }}
            >
              {timeframe.display}
            </Button>
          );
        })}
      </div>

      <div className="flex justify-center flex-col text-center">
        <p className="font-semibold'">Top 50 ScoreSaber Scores ({capitalizeFirstLetter(selectedTimeframe)})</p>
        <p className="text-gray-400">This will only show scores that have been tracked.</p>
      </div>

      {(isLoading || !scores) && (
        <div className="flex justify-center items-center">
          <LoadingIcon />
        </div>
      )}
      {scores && !isLoading && (
        <div className="flex flex-col gap-2 divide-y divide-border">
          {scores.scores.map(({ score, leaderboard, beatSaver }, index) => {
            const player = score.playerInfo;
            const name = score.playerInfo ? player.name || player.id : score.playerId;

            return (
              <div key={index} className="flex flex-col pt-2">
                <p className="text-sm">
                  Set by{" "}
                  <Link href={`/player/${player.id}`}>
                    <span className="text-ssr hover:brightness-[66%] transition-all transform-gpu">{name}</span>
                  </Link>
                </p>
                <Score
                  score={score}
                  leaderboard={leaderboard}
                  beatSaverMap={beatSaver}
                  settings={{
                    hideLeaderboardDropdown: true,
                    hideAccuracyChanger: true,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}