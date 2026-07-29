import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type SIDE_OPTIONS } from "@radix-ui/react-popper";
import { ReactNode } from "react";

export default function SimpleTooltip({
  children,
  display,
  side,
  className,
  showOnMobile: _showOnMobile,
}: {
  children: React.ReactNode;
  display: ReactNode | string;
  side?: (typeof SIDE_OPTIONS)[number];
  className?: string;
  showOnMobile?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={className}>{children}</div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {typeof display === "string" ? <p>{display}</p> : display}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
