import { clsx } from "clsx";
import SimpleLink from "./simple-link";

type Props = {
  href?: string;

  className?: string;

  children: React.ReactNode;
};

export default function FallbackLink({ href, children, className, ...props }: Props) {
  return href ? (
    <SimpleLink href={href} target="_blank" className={clsx("w-fit", className)} {...props}>
      {children}
    </SimpleLink>
  ) : (
    <>{children}</>
  );
}
