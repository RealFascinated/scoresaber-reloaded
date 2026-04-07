import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";

export default function ScoreButton({
  children,
  tooltip,
  href,
  onClick,
  className,
  size = 28,
  ...props
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  href?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
}) {
  const button = (
    <button
      className={cn(
        "border-border bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 focus-visible:ring-primary/50 flex cursor-pointer items-center justify-center rounded-md border p-(--spacing-xs) text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      style={{ width: size, height: size }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <SimpleTooltip display={tooltip}>
        {href ? (
          <SimpleLink href={href} target="_blank">
            {button}
          </SimpleLink>
        ) : (
          button
        )}
      </SimpleTooltip>
    );
  }

  return button;
}
