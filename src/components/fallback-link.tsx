import NextLink from "next/link";

type Props = {
  /**
   * The link to open in a new tab.
   */
  href?: string;

  /**
   * The children to render.
   */
  children: React.ReactNode;
};

export default function FallbackLink({ href, children }: Props) {
  return href ? (
    <NextLink href={href} target="_blank">
      {children}
    </NextLink>
  ) : (
    <>{children}</>
  );
}
