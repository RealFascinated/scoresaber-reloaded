import { cn } from "@/common/utils";
import ScoreSongInfo from "@/components/score/score-song-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SharedIcons } from "@/shared-icons";
import type { ReweightLeaderboardChange } from "@ssr/common/schemas/reweight/reweight";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { getDeltaClass } from "./reweight-format";

export function ReweightLeaderboardsTable({ leaderboards }: { leaderboards: ReweightLeaderboardChange[] }) {
  return (
    <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leaderboard</TableHead>
            <TableHead className="text-center">Stars</TableHead>
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboards.map(leaderboard => {
            const delta = Math.round((leaderboard.newStars - leaderboard.previousStars) * 100) / 100;
            const isUnranked = leaderboard.newStars === 0;
            return (
              <TableRow key={leaderboard.leaderboardId} className="relative cursor-pointer">
                <TableCell className="py-1.5">
                  <ScoreSongInfo
                    song={{
                      name: [leaderboard.songName, leaderboard.songSubName].filter(Boolean).join(" "),
                      authorName: leaderboard.songAuthorName,
                      art: getScoreSaberLeaderboardCoverUrl(leaderboard.songHash),
                    }}
                    level={{ authorName: leaderboard.levelAuthorName, difficulty: leaderboard.difficulty }}
                    imageSize={42}
                    leaderboardId={leaderboard.leaderboardId}
                    stretchSongNameLink
                    shortDiffNames
                    className="line-clamp-1"
                  />
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums">
                  <div className="flex items-center justify-center gap-1 font-medium">
                    <SharedIcons.QualifiedLeaderboardStarIcon className="size-3.5" />
                    <span>{leaderboard.previousStars.toFixed(2)}</span>
                    <SharedIcons.OpenSourceArrowIcon className="text-muted-foreground size-3" />
                    <span>{isUnranked ? "Unranked" : leaderboard.newStars.toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right text-xs font-semibold tabular-nums",
                    isUnranked ? "text-muted-foreground" : getDeltaClass(delta)
                  )}
                >
                  {isUnranked ? (
                    "Unranked"
                  ) : (
                    <>
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(2)}
                    </>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
