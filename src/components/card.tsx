import clsx, { ClassValue } from "clsx";

type Props = {
  children: React.ReactNode;
  className?: ClassValue;
};

export default function Card({ children, className }: Props) {
  return (
    <div
      className={clsx(
        "flex flex-col bg-secondary/90 p-3 rounded-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
