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
   * The background color of the stat.
   */
  color?: string;

  /**
   * The additional classes for the stat.
   */
  className?: string;

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

export default function StatValue({ name, icon, color, className, value, size = "md" }: Props) {
  const sizeClasses = {
    md: "p-1 text-sm gap-2",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const dividerHeight = {
    md: "h-4",
    lg: "h-5",
  };

  return (
    <div
      className={clsx(
        "flex min-w-16 cursor-default items-center justify-center rounded-lg",
        sizeClasses[size],
        color ? color : "bg-accent",
        className
      )}
      style={{
        backgroundColor: (!color?.includes("bg") && color) || undefined,
      }}
    >
      {icon}
      {name && (
        <>
          <p className="font-medium">{name}</p>
          <div className={clsx("w-px bg-white/30", dividerHeight[size])} />
        </>
      )}
      <div className="flex items-center gap-1">{typeof value === "string" ? <p>{value}</p> : value}</div>
    </div>
  );
}
