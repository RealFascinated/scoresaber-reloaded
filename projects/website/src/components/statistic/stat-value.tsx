import clsx from "clsx";

type Props = {
  /**
   * The stat name.
   */
  name?: string;

  /**
   * The icon for the stat.
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
  icon,
  className,
  value,
  textColor,
  valueColor,
  size = "md",
}: Props) {
  const sizeClasses = {
    md: "p-1 px-1.5 text-sm gap-2",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  return (
    <div
      className={clsx(
        "border-border bg-background/90 flex min-w-16 cursor-default items-center justify-center rounded-lg border",
        sizeClasses[size],
        className
      )}
    >
      {icon}
      {name && (
        <>
          <p className={clsx("text-muted-foreground font-medium", textColor)} style={{ color: textColor }}>
            {name}
          </p>
        </>
      )}
      <div
        className={clsx("flex items-center gap-1 font-semibold", valueColor)}
        style={{ color: valueColor }}
      >
        {typeof value === "string" ? <p>{value}</p> : value}
      </div>
    </div>
  );
}
