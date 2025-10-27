import { cn } from "@/common/utils";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";

export default function ScoreButton({
  children,
  tooltip,
  href,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const button = (
    <button
      className={cn(
        "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/50 focus-visible:ring-ring focus-visible:outline-hidden flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-md border p-1 text-sm font-medium transition-all focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
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
