import { cn } from "@/common/utils";

type PlayerNameProps = {
  name: string;
  className?: string;
};

export function PlayerName({ name, className }: PlayerNameProps) {
  return (
    <div className={cn("flex items-center justify-start", className)}>
      <span className="truncate text-sm font-medium text-white">{name}</span>
    </div>
  );
}
