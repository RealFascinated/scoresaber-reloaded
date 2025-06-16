import { cn } from "@/common/utils";

type PlayerNameProps = {
  name: string;
  className?: string;
};

export function PlayerName({ name, className }: PlayerNameProps) {
  return (
    <div className={cn("flex items-center justify-start", className)}>
      <span className="truncate text-white font-medium text-sm">{name}</span>
    </div>
  );
}
