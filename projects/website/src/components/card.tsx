import clsx, { ClassValue } from "clsx";

type Props = {
  children: React.ReactNode;
  className?: ClassValue;
};

export default function Card({ children, className }: Props) {
  return (
    <div
      className={clsx(
        "bg-secondary/90 border-muted/50 flex flex-col rounded-md border p-(--spacing-lg) drop-shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
