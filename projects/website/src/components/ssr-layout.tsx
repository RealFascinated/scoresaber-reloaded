"use client";

import { cn } from "@/common/utils";
import { usePathname } from "next/navigation";

type SSRLayoutProps = {
  children: React.ReactNode;
};

export default function SSRLayout({ children }: SSRLayoutProps) {
  const path = usePathname();

  return (
    <div className={cn("w-full z-[1] flex-grow flex", path !== "/" ? "m-auto max-w-[1600px] pt-2" : "")}>
      {children}
    </div>
  );
}
