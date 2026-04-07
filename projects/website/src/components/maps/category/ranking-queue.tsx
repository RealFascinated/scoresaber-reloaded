import { cn } from "@/common/utils";
import Card from "@/components/card";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { RankingQueueLeaderboard } from "@ssr/common/schemas/response/leaderboard/ranking-queue-leaderboards";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import SimpleTooltip from "../../simple-tooltip";

export default function RankingQueue() {
  const { data: rankingRequests, isLoading } = useQuery({
    queryKey: ["ranking-queue"],
    queryFn: async () => ssrApi.fetchRankingQueue(),
  });
  const [showOpenRankUnrank, setShowOpenRankUnrank] = useState(false);

  const renderRequests = (name: string, requests: RankingQueueLeaderboard[]) => {
    return (
      <Card className="flex flex-col gap-(--spacing-lg)">
        <h3 className="text-lg font-semibold">{name}</h3>

        <div className="border-border bg-background/50 relative overflow-x-auto rounded-lg border">
          <table className="table w-full min-w-[760px] table-auto border-spacing-0 text-left text-sm">
            <thead>
              <tr className="border-border bg-muted/30 border-b">
                <th className="text-foreground/90 px-3 py-2.5 font-semibold">Leaderboard</th>
                <th className="text-foreground/90 px-2 py-2.5 text-center font-semibold">Difficulties</th>
                <th className="text-foreground/90 min-w-[130px] px-3 py-2.5 text-center font-semibold">
                  Daily Plays
                </th>
                <th className="text-foreground/90 px-2 py-2.5 text-center font-semibold">Plays</th>
                <th className="text-foreground/90 min-w-[130px] px-2 py-2.5 text-center font-semibold">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map(leaderboard => {
                return (
                  <tr
                    key={leaderboard.id}
                    className="border-border/60 hover:bg-accent/40 border-b transition-colors last:border-b-0"
                  >
                    {/* Leaderboard Name */}
                    <td className="px-3 py-1.5">
                      <SimpleLink href={`/leaderboard/${leaderboard.id}`} className="block">
                        <ScoreSongInfo
                          song={{
                            name: leaderboard.fullName,
                            authorName: leaderboard.songAuthorName,
                            art: leaderboard.songArt,
                          }}
                          level={{
                            authorName: leaderboard.levelAuthorName,
                            difficulty: leaderboard.difficulty.difficulty,
                          }}
                          imageSize={42}
                          clickableSongName={false}
                          shortDiffNames
                        />
                      </SimpleLink>
                    </td>
                    {/* Difficulties */}
                    <td className="px-3 py-1.5 text-center text-xs">{leaderboard.difficultyCount}</td>

                    {/* Daily Plays */}
                    <td className="px-3 py-1.5 text-center text-xs text-gray-400">
                      <SimpleTooltip display="The total number of daily plays on this leaderboard">
                        <p className="inline-flex items-center justify-center gap-1">
                          <PlayIcon className="h-3 w-3" />
                          {formatNumberWithCommas(leaderboard.dailyPlays)}
                        </p>
                      </SimpleTooltip>
                    </td>

                    {/* Plays */}
                    <td className="px-3 py-1.5 text-center text-xs text-gray-400">
                      <SimpleTooltip display="The total number of plays on this leaderboard">
                        <p className="inline-flex items-center justify-center gap-1">
                          <PlayIcon className="h-3 w-3" />
                          {formatNumberWithCommas(leaderboard.plays)}
                        </p>
                      </SimpleTooltip>
                    </td>

                    {/* Created */}
                    <td
                      className="px-3 py-1.5 text-center text-xs text-gray-400"
                      title={formatDate(leaderboard.timestamp)}
                    >
                      {timeAgo(leaderboard.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex w-full justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-(--spacing-lg)">
      {renderRequests("Next in Queue", rankingRequests?.nextInQueue ?? [])}

      <Button
        variant="secondary"
        className="w-fit gap-(--spacing-sm)"
        onClick={() => setShowOpenRankUnrank(!showOpenRankUnrank)}
      >
        <ChevronDownIcon
          className={cn("h-4 w-4 transition-transform duration-200", showOpenRankUnrank ? "rotate-180" : "")}
        />
        {(showOpenRankUnrank ? "Show" : "Hide") + " All Requests"}
      </Button>

      {showOpenRankUnrank &&
        renderRequests("Open rank/unrank requests", rankingRequests?.openRankUnrank ?? [])}
    </div>
  );
}
