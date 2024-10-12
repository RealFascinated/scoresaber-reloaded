import NextLink from "next/link";
import { clsx } from "clsx";

type Props = {
  /**
   * The link to open in a new tab.
   */
  href?: string;

  /**
   * The class name to apply to the link.
   */
  className?: string;

  /**
   * The children to render.
   */
  children: React.ReactNode;
};

export default function FallbackLink({ href, children, className }: Props) {
  return href ? (
    <NextLink href={href} target="_blank" className={clsx("w-fit", className)}>
      {children}
    </NextLink>
  ) : (
    <>{children}</>
  );
}
