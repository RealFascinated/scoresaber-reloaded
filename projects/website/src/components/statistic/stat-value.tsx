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
};

export default function StatValue({ name, icon, color, className, value }: Props) {
  return (
    <div
      className={clsx(
        "flex min-w-16 cursor-default items-center justify-center gap-2 rounded-md p-1 text-sm",
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
          <p>{name}</p>
          <div className="h-4 w-px bg-white" />
        </>
      )}
      <div className="flex items-center gap-1">{typeof value === "string" ? <p>{value}</p> : value}</div>
    </div>
  );
}
