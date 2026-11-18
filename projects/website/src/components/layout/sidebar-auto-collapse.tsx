"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useEffect } from "react";

const AUTO_COLLAPSE_QUERY = "(min-width: 768px) and (max-width: 1279px)";

/**
 * Collapses the sidebar when the viewport enters the mid-width range (tablet / small laptop),
 * so the page content keeps enough room. Users can still re-open it manually.
 */
export function SidebarAutoCollapse() {
  const { setOpen } = useSidebar();

  useEffect(() => {
    const mq = window.matchMedia(AUTO_COLLAPSE_QUERY);
    if (mq.matches) {
      setOpen(false);
    }

    const onChange = (event: MediaQueryListEvent) => {
      setOpen(!event.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
