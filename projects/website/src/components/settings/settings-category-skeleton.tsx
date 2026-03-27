import { Skeleton } from "@/components/ui/skeleton";

export function SettingsCategorySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading settings">
      {[1, 2, 3].map(section => (
        <div key={section} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
