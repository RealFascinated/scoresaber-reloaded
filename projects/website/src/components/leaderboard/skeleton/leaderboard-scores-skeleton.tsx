import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardScoreSkeleton } from "@/components/leaderboard/skeleton/leaderboard-score-skeleton";

export default function LeaderboardScoresSkeleton() {
  return (
    <>
      {/* Loading Skeleton for the LeaderboardScores Table */}
      <div className="overflow-x-auto relative">
        <table className="table w-full table-auto border-spacing-2 border-none text-left text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1">Rank</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1 text-center">Time Set</th>
              <th className="px-2 py-1 text-center">Score</th>
              <th className="px-2 py-1 text-center">Accuracy</th>
              <th className="px-2 py-1 text-center">Misses</th>
              <th className="px-2 py-1 text-center">PP</th>
              <th className="px-2 py-1 text-center">Mods</th>
            </tr>
          </thead>
          <tbody>
            {/* Loop over to create 10 skeleton rows */}
            {[...Array(10)].map((_, index) => (
              <tr key={index} className="border-b border-border">
                <LeaderboardScoreSkeleton />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Skeleton for Pagination */}
      <div className="flex justify-center mt-4">
        <Skeleton className="w-32 h-10 rounded-md" />
      </div>
    </>
  );
}
