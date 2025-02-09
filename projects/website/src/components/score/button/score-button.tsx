import Tooltip from "@/components/tooltip";
import Link from "next/link";

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
   * The link to open
   */
  href?: string;

  /**
   * Callback for when the button is clicked.
   */
  onClick?: () => void;
};

export default function ScoreButton({ children, tooltip, href, onClick }: Props) {
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
      <Tooltip display={tooltip}>
        {href ? (
          <Link prefetch={false} href={href} target="_blank">
            {button}
          </Link>
        ) : (
          button
        )}
      </Tooltip>
    );
  }

  return button;
}
