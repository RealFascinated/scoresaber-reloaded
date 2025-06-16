import Card from "@/components/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlayerMiniRankingSkeleton() {
  const skeletonArray = new Array(5).fill(0);

  return (
    <Card className="w-[400px] flex gap-2 sticky select-none">
      <div className="flex gap-2">
        <Skeleton className="w-6 h-6 rounded-full animate-pulse" /> {/* Icon Skeleton */}
        <Skeleton className="w-32 h-6 animate-pulse" /> {/* Text Skeleton for Ranking */}
      </div>

      <div className="flex flex-col text-sm">
        {skeletonArray.map((_, index) => (
          <div
            key={index}
            className="grid gap-2 grid-cols-[auto_1fr_auto] items-center bg-accent px-2 py-1.5 cursor-pointer transition-all first:rounded-t last:rounded-b"
          >
            <Skeleton className="w-12 h-6" /> {/* Rank Skeleton */}
            <div className="flex gap-2 items-center">
              <Skeleton className="w-6 h-6 rounded-full animate-pulse" /> {/* Avatar Skeleton */}
              <Skeleton className="w-24 h-6 animate-pulse" /> {/* Player Name Skeleton */}
            </div>
            <div className="inline-flex min-w-[10.75em] gap-2 items-center">
              <Skeleton className="w-16 h-6 animate-pulse" /> {/* PP Value Skeleton */}
              <Skeleton className="w-8 h-4 animate-pulse" /> {/* PP Difference Skeleton */}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
