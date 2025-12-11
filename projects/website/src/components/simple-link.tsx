"use client";

import Link, { LinkProps } from "next/link";
import { useState } from "react";

export default function SimpleLink({
  children,
  href,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...props
}: { children: React.ReactNode; href: string } & LinkProps &
  Omit<React.ComponentProps<"a">, "href">) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Link
      href={href}
      {...props}
      onClick={onClick}
      onMouseEnter={e => {
        setIsHovering(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        setIsHovering(false);
        onMouseLeave?.(e);
      }}
      prefetch={isHovering ? true : undefined}
    >
      {children}
    </Link>
  );
}
