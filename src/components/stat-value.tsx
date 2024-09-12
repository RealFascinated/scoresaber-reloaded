type Props = {
  /**
   * The stat name.
   */
  name?: string;

  /**
   * The value of the stat.
   */
  value: React.ReactNode;
};

export default function StatValue({ name, value }: Props) {
  return (
    <div className="flex min-w-16 gap-2 bg-accent h-[28px] p-1 items-center justify-center rounded-md text-sm">
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
