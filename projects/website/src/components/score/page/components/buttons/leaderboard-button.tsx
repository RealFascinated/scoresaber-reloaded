import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import { Button, type ButtonProps } from "@/components/ui/button";
import { env } from "@ssr/common/env";
import { ListOrdered } from "lucide-react";

type LeaderboardButtonProps = {
  leaderboardId: number;
} & Omit<ButtonProps, "asChild" | "children">;

export default function LeaderboardButton({
  leaderboardId,
  variant = "outline",
  size = "sm",
  className,
  ...buttonProps
}: LeaderboardButtonProps) {
  return (
    <SimpleLink className="inline-flex" href={`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`}>
      <Button variant={variant} size={size} className={cn("gap-1.5 font-medium", className)} {...buttonProps}>
        <ListOrdered className="size-3.5 shrink-0 opacity-90" aria-hidden />
        Leaderboard
      </Button>
    </SimpleLink>
  );
}
