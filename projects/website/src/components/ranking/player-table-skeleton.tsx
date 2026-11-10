import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder matching the ranking / medals player tables while they load.
 */
export function PlayerTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="ring-border bg-card overflow-hidden rounded-xl ring-1" aria-busy="true">
      <div className="border-border/50 flex h-10 items-center gap-3 border-b px-3">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="ml-10 h-3 w-14" />
        <Skeleton className="ml-6 h-3 w-12" />
        <Skeleton className="ml-auto h-3 w-8" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="border-border/50 flex h-[49px] items-center gap-3 border-b px-3 last:border-0"
        >
          <Skeleton className="h-4 w-12" />
          <Skeleton className="ml-8 h-4 w-14" />
          <Skeleton className="ml-6 size-7 rounded-full" />
          <Skeleton className="h-4 w-32 sm:w-48" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
