import clsx, { ClassValue } from "clsx";

type Props = {
  children: React.ReactNode;
  className?: ClassValue;
  style?: React.CSSProperties;
};

export default function Card({ children, className, style }: Props) {
  return (
    <div
      className={clsx("bg-card/90 border-border flex flex-col rounded-lg border p-(--spacing-lg)", className)}
      style={style}
    >
      {children}
    </div>
  );
}
