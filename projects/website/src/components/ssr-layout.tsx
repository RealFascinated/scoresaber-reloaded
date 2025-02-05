"use client";

import { cn } from "@/common/utils";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type SSRLayoutProps = {
  children: ReactNode;
  className?: string;
};

export default function SSRLayout({ children, className }: SSRLayoutProps) {
  const path = usePathname();

  return (
    <div
      className={cn(
        "w-full z-[1] flex-grow flex",
        path !== "/" ? "m-auto max-w-[1600px] " + className : ""
      )}
    >
      {children}
    </div>
  );
}
