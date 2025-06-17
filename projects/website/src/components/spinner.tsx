import { cn } from "@/common/utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center justify-center">
      <ArrowPathIcon className={cn("text-primary/80 animate-spin", sizeClasses[size], className)} />
    </div>
  );
}
