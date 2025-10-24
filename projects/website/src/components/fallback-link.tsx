import { clsx } from "clsx";
import NextLink from "next/link";

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

export default function FallbackLink({ href, children, className, ...props }: Props) {
  return href ? (
    <NextLink href={href} target="_blank" className={clsx("w-fit", className)} {...props}>
      {children}
    </NextLink>
  ) : (
    <>{children}</>
  );
}
