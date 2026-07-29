import { cn } from "@/common/utils";
import ScoreSongInfo from "@/components/score/score-song-info";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { RankingQueueLeaderboard } from "@ssr/common/schemas/response/leaderboard/ranking-queue-leaderboards";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import SimpleTooltip from "../../simple-tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

export default function RankingQueue() {
  const { data: rankingRequests, isLoading } = useQuery({
    queryKey: ["ranking-queue"],
    queryFn: async () => ssrApi.fetchRankingQueue(),
  });
  const [showOpenRankUnrank, setShowOpenRankUnrank] = useState(false);
  const router = useRouter();

  const renderRequests = (name: string, requests: RankingQueueLeaderboard[]) => {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">{name}</h3>

        <div className="rounded-xl ring-1 ring-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leaderboard</TableHead>
                <TableHead className="text-center">Difficulties</TableHead>
                <TableHead className="text-center">Daily Plays</TableHead>
                <TableHead className="text-center">Plays</TableHead>
                <TableHead className="text-center">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(leaderboard => (
                <TableRow
                  key={leaderboard.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/leaderboard/${leaderboard.id}`)}
                >
                  <TableCell className="py-1.5">
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
                  </TableCell>
                  <TableCell className="text-center text-xs">{leaderboard.difficultyCount}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    <SimpleTooltip display="Plays on this leaderboard in the last 24 hours">
                      <p className="inline-flex items-center justify-center gap-1">
                        <SharedIcons.PlayMapIcon className="h-3 w-3" />
                        {formatNumberWithCommas(leaderboard.dailyPlays)}
                      </p>
                    </SimpleTooltip>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    <SimpleTooltip display="Total plays on this leaderboard">
                      <p className="inline-flex items-center justify-center gap-1">
                        <SharedIcons.PlayMapIcon className="h-3 w-3" />
                        {formatNumberWithCommas(leaderboard.plays)}
                      </p>
                    </SimpleTooltip>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    <SimpleTooltip
                      display={<p>{formatDate(leaderboard.timestamp, "Do MMMM, YYYY HH:mm a")}</p>}
                    >
                      <p className="text-muted-foreground">{timeAgo(leaderboard.timestamp)}</p>
                    </SimpleTooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex w-full justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {renderRequests("Next in Queue", rankingRequests?.nextInQueue ?? [])}

      <Button
        variant="secondary"
        className="w-fit gap-(--spacing-sm)"
        onClick={() => setShowOpenRankUnrank(!showOpenRankUnrank)}
      >
        <SharedIcons.RankingQueueExpandIcon
          className={cn("h-4 w-4 transition-transform duration-200", showOpenRankUnrank ? "rotate-180" : "")}
        />
        {(showOpenRankUnrank ? "Show" : "Hide") + " All Requests"}
      </Button>

      {showOpenRankUnrank &&
        renderRequests("Open rank/unrank requests", rankingRequests?.openRankUnrank ?? [])}
    </div>
  );
}
