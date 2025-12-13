"use client";

import Link from "next/link";
import { useState } from "react";

export default function SimpleLink({
  children,
  href,
  ...props
}: { children: React.ReactNode; href: string } & React.ComponentProps<"a">) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Link
      href={href}
      {...props}
      prefetch={isHovering}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
    </Link>
  );
}
