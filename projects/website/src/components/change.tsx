import { formatChange } from "@ssr/common/utils/utils";
import clsx from "clsx";

type ChangeProps = {
  /**
   * The amount the value changed
   */
  change: number | undefined;

  /**
   * The function to format the value
   * @param value
   */
  formatValue?: (value: number) => string;

  /**
   * The additional class names
   */
  className?: string;

  /**
   * Whether the number is a pp number
   */
  isPp?: boolean;

  /**
   * Should we use colors?
   */
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
