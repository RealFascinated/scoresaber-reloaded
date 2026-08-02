import Card from "@/components/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="w-full">
      <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Player header */}
          <Card className="flex flex-col gap-6">
            <div className="relative flex flex-col items-center gap-6 text-center select-none lg:flex-row lg:items-start lg:text-start">
              {/* Avatar + streak (lg) */}
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="size-32 rounded-full border-2" />
                <div className="hidden lg:flex">
                  <Skeleton className="h-18 w-[132px] rounded-xl" />
                </div>
              </div>

              {/* Name + overview + stats + actions */}
              <div className="flex w-full flex-col items-center justify-center gap-3 lg:items-start lg:justify-start">
                <div className="flex w-full flex-col">
                  <div className="flex items-center justify-center gap-3 lg:justify-start">
                    <Skeleton className="h-8 w-48 max-w-[300px]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Empty inactive/banned badge row — mirrors the real header, which renders this row (empty for normal players) and so adds a gap-2 below the name */}
                    <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start" />
                    <div className="flex flex-wrap items-center justify-center gap-2 lg:items-start lg:justify-start">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-28 rounded-xl" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-wrap justify-center gap-2 lg:justify-start">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-24 rounded-xl" />
                  ))}
                </div>

                <div className="flex lg:hidden">
                  <Skeleton className="h-18 w-[132px] rounded-xl" />
                </div>
              </div>
            </div>

            {/* Player footer: actions + acc badges */}
            <div className="border-border/50 flex flex-col-reverse items-center gap-4 border-t pt-6 md:flex-row md:justify-between md:pt-4">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="size-9 rounded-md" />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-20 rounded-xl" />
                ))}
              </div>
            </div>
          </Card>

          {/* Player badges */}
          <div className="ring-border bg-card rounded-xl p-4 ring-1">
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[30px] w-20" />
              ))}
            </div>
          </div>

          {/* Player views / charts */}
          <div className="ring-border bg-card rounded-xl p-4 ring-1">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-center gap-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-24" />
                ))}
              </div>

              <div className="bg-chart-card ring-border flex flex-col rounded-xl p-2.5 ring-1">
                <div className="flex h-[400px] items-center justify-center" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-9 w-[180px]" />
              </div>
            </div>
          </div>

          {/* Platform scores */}
          <div className="flex flex-col">
            <div className="flex">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-32 rounded-b-none" />
              ))}
            </div>

            <div className="[&>div]:rounded-tl-none">
              <div className="ring-border bg-card flex flex-col gap-1 rounded-xl rounded-tl-none p-4 ring-1">
                <div className="flex w-full flex-col gap-2">
                  {/* Control panel */}
                  <div className="ring-border bg-card rounded-xl p-4 ring-1">
                    <div className="mb-2 flex justify-center">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton key={index} className="h-8 w-16 rounded-md" />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-full sm:w-64" />
                    </div>
                  </div>

                  {/* Scores list */}
                  <div className="flex flex-col">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex w-full justify-center">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 7 }).map((_, index) => (
                        <Skeleton key={index} className="h-9 w-10 rounded-md" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini rankings sidebar */}
        <aside className="hidden w-full shrink-0 md:block md:w-96">
          <div className="sticky top-4 flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="bg-card ring-border flex w-full flex-col gap-2 rounded-xl p-3 text-xs ring-1 select-none"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="divide-border bg-accent/50 divide-y rounded-md">
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="h-4 w-[125px]" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
