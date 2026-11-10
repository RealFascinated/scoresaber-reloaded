import { Colors } from "@/common/colors";

export const CHART_COLORS = {
  primary: Colors.hands.right,
} as const;

export function getEmptyStateClassName(height: number = 400): string {
  return `border-border bg-muted flex h-[${height}px] w-full items-center justify-center rounded-xl border`;
}
