import { Tooltip as ShadCnTooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Props = {
  /**
   * What will trigger the tooltip
   */
  children: React.ReactNode;

  /**
   * What will be displayed in the tooltip
   */
  display: React.ReactNode;
};

export default function Tooltip({ children, display }: Props) {
  return (
    <ShadCnTooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{display}</TooltipContent>
    </ShadCnTooltip>
  );
}
