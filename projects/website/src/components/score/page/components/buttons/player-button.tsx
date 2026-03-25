import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import { Button, type ButtonProps } from "@/components/ui/button";
import { env } from "@ssr/common/env";
import { UserRound } from "lucide-react";

type PlayerButtonProps = {
  playerId: string;
} & Omit<ButtonProps, "asChild" | "children">;

export default function PlayerButton({
  playerId,
  variant = "outline",
  size = "sm",
  className,
  ...buttonProps
}: PlayerButtonProps) {
  return (
    <SimpleLink className="inline-flex" href={`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${playerId}`}>
      <Button variant={variant} size={size} className={cn("gap-1.5 font-medium", className)} {...buttonProps}>
        <UserRound className="size-3.5 shrink-0 opacity-90" aria-hidden />
        Player
      </Button>
    </SimpleLink>
  );
}
