import clsx, { ClassValue } from "clsx";

type Props = {
  children: React.ReactNode;
  className?: ClassValue;
  style?: React.CSSProperties;
};

export default function Card({ children, className, style }: Props) {
  return (
    <div
      className={clsx("bg-card flex flex-col rounded-xl p-4 text-sm ring-1 ring-border", className)}
      style={style}
    >
      {children}
    </div>
  );
}
