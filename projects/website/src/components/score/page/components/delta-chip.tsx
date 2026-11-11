import { cn } from "@/common/utils";

type DeltaChipProps = {
  /**
   * The change versus the previous score (current - previous).
   */
  value: number;

  /**
   * Formats the absolute change for display.
   */
  format: (absoluteValue: number) => string;

  /**
   * When true, a decrease is considered an improvement (e.g. misses).
   */
  lowerIsBetter?: boolean;

  className?: string;
};

export function DeltaChip({ value, format, lowerIsBetter = false, className }: DeltaChipProps) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
    return null;
  }

  const improved = lowerIsBetter ? value < 0 : value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        improved ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
        className
      )}
      title="Compared to previous score"
    >
      {value > 0 ? "+" : "-"}
      {format(Math.abs(value))}
    </span>
  );
}
