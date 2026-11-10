import { formatChange } from "@ssr/common/utils/utils";
import clsx from "clsx";

type ChangeProps = {
  change: number | undefined;

  formatValue?: (value: number) => string;

  className?: string;

  isPp?: boolean;

  showColors?: boolean;
};

export function Change({ change, formatValue, className, isPp, showColors }: ChangeProps) {
  const formatted = formatChange(change, formatValue, isPp);
  if (formatted === undefined || change === undefined) {
    return undefined;
  }

  return (
    <p className={clsx("text-sm", showColors && (change > 0 ? "text-success" : "text-danger"), className)}>
      {formatted}
    </p>
  );
}
