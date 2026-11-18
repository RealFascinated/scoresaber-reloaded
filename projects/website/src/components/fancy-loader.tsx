import { cn } from "@/common/utils";
import { Spinner } from "./spinner";

export function FancyLoader({ title, description }: { title: string; description: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8",
        "bg-accent-deep/50 border-border gap-4 border"
      )}
    >
      <Spinner size="lg" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
