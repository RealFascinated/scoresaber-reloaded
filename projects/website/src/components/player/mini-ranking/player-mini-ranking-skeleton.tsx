import Card from "@/components/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlayerMiniRankingSkeleton() {
  const skeletonArray = new Array(5).fill(0);

  return (
    <Card className="sticky flex w-[400px] gap-2 select-none">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-6 animate-pulse rounded-full" /> {/* Icon Skeleton */}
        <Skeleton className="h-6 w-32 animate-pulse" /> {/* Text Skeleton for Ranking */}
      </div>

      <div className="flex flex-col text-sm">
        {skeletonArray.map((_, index) => (
          <div
            key={index}
            className="bg-accent grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 transition-all first:rounded-t last:rounded-b"
          >
            <Skeleton className="h-6 w-12" /> {/* Rank Skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 animate-pulse rounded-full" /> {/* Avatar Skeleton */}
              <Skeleton className="h-6 w-24 animate-pulse" /> {/* Player Name Skeleton */}
            </div>
            <div className="inline-flex min-w-[10.75em] items-center gap-2">
              <Skeleton className="h-6 w-16 animate-pulse" /> {/* PP Value Skeleton */}
              <Skeleton className="h-4 w-8 animate-pulse" /> {/* PP Difference Skeleton */}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
