import { cn } from "@/common/utils";
import { formatPp } from "@ssr/common/utils/number-utils";

type PlayerPpDisplayProps = {
  pp: number;
  className?: string;
};

export function PlayerPpDisplay({ pp, className }: PlayerPpDisplayProps) {
  return (
    <div className={cn("flex flex-col items-center lg:flex-row lg:gap-3", className)}>
      <span className="text-pp text-sm font-bold">{formatPp(pp)}pp</span>
    </div>
  );
}
