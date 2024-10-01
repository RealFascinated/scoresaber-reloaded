import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  /**
   * The button content.
   */
  children: React.ReactNode;

  /**
   * The tooltip content.
   */
  tooltip?: React.ReactNode;

  /**
   * Callback for when the button is clicked.
   */
  onClick: () => void;
};

export default function ScoreButton({ children, tooltip, onClick }: Props) {
  const button = (
    <button
      className="bg-accent rounded-md flex justify-center items-center p-1 w-[28px] h-[28px] hover:brightness-75 transform-gpu transition-all cursor-pointer"
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
