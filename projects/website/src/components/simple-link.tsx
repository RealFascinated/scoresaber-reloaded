"use client";

import Link, { LinkProps } from "next/link";

export default function SimpleLink({
  children,
  href,
  ...props
}: { children: React.ReactNode; href: string } & LinkProps & React.ComponentProps<"a">) {
  // const [isHovering, setIsHovering] = useState(false);

  return (
    <Link
      href={href}
      {...props}
      // Only prefetch when hovering
      // onMouseEnter={() => setIsHovering(true)}
      // onMouseLeave={() => setIsHovering(false)}
      // prefetch={isHovering}
    >
      {children}
    </Link>
  );
}
