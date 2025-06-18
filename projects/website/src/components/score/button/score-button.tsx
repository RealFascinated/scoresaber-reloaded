import SimpleTooltip from "@/components/simple-tooltip";
import Link from "next/link";

export default function ScoreButton({
  children,
  tooltip,
  href,
  onClick,
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
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
