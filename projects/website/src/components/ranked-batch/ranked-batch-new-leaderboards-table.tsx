import ScoreSongInfo from "@/components/score/score-song-info";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SharedIcons } from "@/shared-icons";
import type { RankedBatchNewLeaderboard } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";

export function RankedBatchNewLeaderboardsTable({
  leaderboards,
}: {
  leaderboards: RankedBatchNewLeaderboard[];
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leaderboard</TableHead>
            <TableHead className="text-right">Stars</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboards.map(leaderboard => (
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
              <TableCell className="text-right text-xs font-medium tabular-nums">
                <div className="flex items-center justify-end gap-1">
                  <SharedIcons.QualifiedLeaderboardStarIcon className="size-3.5" />
                  <span>{leaderboard.stars.toFixed(2)}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
