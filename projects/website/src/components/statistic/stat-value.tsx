import clsx from "clsx";
import { useId } from "react";

type Props = {
  /**
   * The stat name (rendered as the description list term).
   */
  name?: string;

  /**
   * When true, the term is exposed to assistive technology only.
   * Use when a parent control already shows the same label (e.g. a tooltip title).
   */
  labelSrOnly?: boolean;

  /**
   * The icon for the stat (decorative when a name is present).
   */
  icon?: React.ReactNode;

  /**
   * The additional classes for the stat.
   */
  className?: string;

  /**
   * The text color of the stat.
   */
  textColor?: string;

  /**
   * The value color of the stat.
   */
  valueColor?: string;

  /**
   * The value of the stat.
   */
  value: React.ReactNode;

  /**
   * The size of the stat badge.
   * @default "md"
   */
  size?: "md" | "lg";
};

export default function StatValue({
  name,
  labelSrOnly = false,
  icon,
  className,
  value,
  textColor,
  valueColor,
  size = "md",
}: Props) {
  const termId = useId();
  const sizeClasses = {
    md: "p-1 px-1.5 text-sm gap-2",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const hasTerm = name !== undefined || icon !== undefined;

  return (
    <dl
      className={clsx(
        "border-border bg-background/90 m-0 flex min-w-16 cursor-default items-center justify-center rounded-lg border",
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-center gap-2">
        {hasTerm && (
          <dt
            id={name !== undefined ? termId : undefined}
            className={clsx(
              "text-muted-foreground m-0 flex items-center gap-2 font-medium",
              labelSrOnly && "sr-only",
              textColor
            )}
            style={{ color: textColor }}
          >
            {icon !== undefined && <span aria-hidden="true">{icon}</span>}
            {name}
          </dt>
        )}
        <dd
          className={clsx("m-0 flex items-center gap-1 font-semibold", valueColor)}
          style={{ color: valueColor }}
          aria-labelledby={name !== undefined ? termId : undefined}
        >
          {typeof value === "string" ? value : value}
        </dd>
      </div>
    </dl>
  );
}
