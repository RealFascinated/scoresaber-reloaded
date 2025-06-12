import { cn } from "@/common/utils";
import { Spinner } from "./spinner";

export function FancyLoader({ title, description }: { title: string; description: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[200px] p-8 rounded-xl",
        "bg-accent-deep/50 border border-border/50 backdrop-blur-sm gap-4"
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
