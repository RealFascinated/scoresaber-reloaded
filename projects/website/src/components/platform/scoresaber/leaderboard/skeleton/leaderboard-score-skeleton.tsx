import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardScoreSkeleton() {
  return (
    <>
      {/* Skeleton for Score Rank */}
      <td className="px-4 py-2">
        <Skeleton className="w-6 h-4 rounded-md" />
      </td>

      {/* Skeleton for Player Info */}
      <td className="px-4 py-2 flex gap-2">
        <Skeleton className="w-24 h-4 rounded-md" />
      </td>

      {/* Skeleton for Time Set */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-20 h-4 rounded-md mx-auto" />
      </td>

      {/* Skeleton for Score */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-16 h-4 rounded-md mx-auto" />
      </td>

      {/* Skeleton for Accuracy */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-16 h-4 rounded-md mx-auto" />
      </td>

      {/* Skeleton for Misses */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-8 h-4 rounded-md mx-auto" />
      </td>

      {/* Skeleton for PP */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-12 h-4 rounded-md mx-auto" />
      </td>

      {/* Skeleton for Modifiers */}
      <td className="px-4 py-2 text-center">
        <Skeleton className="w-10 h-4 rounded-md mx-auto" />
      </td>
    </>
  );
}
