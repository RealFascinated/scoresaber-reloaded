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
  // The player page keeps its cards directly on the background cover, every other page sits on the sheet
  const usesPageSheet = !path.startsWith("/player/");

  return (
    <div
      className={cn(
        "z-1 flex w-full grow flex-col",
        path !== "/" && cn("mx-auto w-full max-w-[1632px]", usesPageSheet && "page-sheet", className)
      )}
    >
      {children}
    </div>
  );
}
