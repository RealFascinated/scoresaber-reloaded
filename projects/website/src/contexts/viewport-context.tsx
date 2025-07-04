"use client";

import { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useState } from "react";

interface ViewportContextType {
  isMobile: boolean;
  width: number;
  height: number;
}

const ViewportContext = createContext<ViewportContextType | null>(null);

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<ViewportContextType>(getInitialViewport);

  useIsomorphicLayoutEffect(() => {
    const handleResize = () => {
      const dimensions = getWindowDimensions();
      const next = {
        width: dimensions.width,
        height: dimensions.height,
        isMobile: checkMobile(),
      } as ViewportContextType;

      if (process.env.NODE_ENV !== "production") {
        console.debug("[Viewport] resize", next);
      }

      setViewport(next);
    };

    // Initialize on mount
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <ViewportContext.Provider value={viewport}>{children}</ViewportContext.Provider>;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getInitialViewport(): ViewportContextType {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, isMobile: false };
  }
  const { innerWidth, innerHeight } = window;
  return {
    width: innerWidth,
    height: innerHeight,
    isMobile: checkMobile(),
  };
}

function getWindowDimensions() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

function checkMobile(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Use the high-level hint if the browser provides it *and it's true*.
  // If it's false we still want to let viewport width affect the outcome for
  // responsive desktop layouts.
  const uaData = (navigator as any).userAgentData;
  if (uaData?.mobile === true) {
    return true;
  }

  // 2. Fall back to user-agent sniffing.
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // 3. Finally, rely on viewport width.
  const isSmallViewport = window.innerWidth <= 767;

  return isMobileUA || isSmallViewport;
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error("useViewport must be used within a ViewportProvider");
  }
  return context;
}

export function useIsMobile() {
  const { isMobile } = useViewport();
  return isMobile;
}

export function useWindowDimensions() {
  const { width, height } = useViewport();
  return { width, height };
}
