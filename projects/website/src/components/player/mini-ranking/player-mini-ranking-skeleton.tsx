import Card from "@/components/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlayerMiniRankingSkeleton() {
  const skeletonArray = new Array(5).fill(0);

  return (
    <Card className="sticky flex w-full select-none flex-col gap-2 text-xs sm:w-[400px] sm:text-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 animate-pulse" /> {/* Icon Skeleton */}
        <Skeleton className="h-4 w-20 animate-pulse" /> {/* Text Skeleton for Ranking Type */}
      </div>

      {/* Players List */}
      <div className="divide-border divide-y">
        {skeletonArray.map((_, index) => (
          <div
            key={index}
            className="grid items-center gap-2 px-1 py-1.5 sm:px-2"
            style={{ gridTemplateColumns: "auto 48px 1fr auto" }}
          >
            {/* Rank */}
            <Skeleton className="h-4 w-8 animate-pulse" />

            {/* Avatar */}
            <Skeleton className="h-6 w-6 animate-pulse rounded-full" />

            {/* Name */}
            <Skeleton className="h-4 w-24 animate-pulse" />

            {/* PP */}
            <Skeleton className="h-4 w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}
