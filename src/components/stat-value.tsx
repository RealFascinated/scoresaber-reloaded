import clsx, { ClassValue } from "clsx";

type Props = {
  /**
   * The stat name.
   */
  name?: string;

  /**
   * The background color of the stat.
   */
  color?: ClassValue;

  /**
   * The value of the stat.
   */
  value: React.ReactNode;
};

export default function StatValue({ name, color, value }: Props) {
  return (
    <div
      className={clsx(
        "flex min-w-16 gap-2 h-[28px] p-1 items-center justify-center rounded-md text-sm",
        color ? color : "bg-accent"
      )}
    >
      {name && (
        <>
          <p>{name}</p>
          <div className="h-4 w-[1px] bg-primary" />
        </>
      )}
      <div className="flex gap-1 items-center">{typeof value === "string" ? <p>{value}</p> : value}</div>
    </div>
  );
}
