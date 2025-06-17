import SimpleTooltip from "@/components/simple-tooltip";
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
      className="bg-accent flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-md p-1 transition-all hover:brightness-75"
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <SimpleTooltip display={tooltip}>
        {href ? (
          <Link href={href} target="_blank">
            {button}
          </Link>
        ) : (
          button
        )}
      </SimpleTooltip>
    );
  }

  return button;
}
