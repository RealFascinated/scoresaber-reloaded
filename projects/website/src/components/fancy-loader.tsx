import { cn } from "@/common/utils";
import { Spinner } from "./spinner";

export function FancyLoader({ title, description }: { title: string; description: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center rounded-xl p-8",
        "bg-accent-deep/50 border-border gap-4 border backdrop-blur-sm"
      )}
    >
      <Spinner size="lg" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-foreground text-lg font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
