"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface ViewportContextType {
  isMobile: boolean;
  width: number;
  height: number;
}

const ViewportContext = createContext<ViewportContextType | null>(null);

function getWindowDimensions() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

function checkMobile() {
  if (typeof window === "undefined") {
    return false;
  }

  // Check for mobile user agent
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Check for small screen width (common mobile breakpoint)
  const isSmallScreen = window.innerWidth < 768;

  // Return true if either condition is met
  return isMobileUserAgent || isSmallScreen;
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<ViewportContextType>({
    width: 0,
    height: 0,
    isMobile: false,
  });

  useEffect(() => {
    const handleResize = () => {
      const dimensions = getWindowDimensions();
      setViewport({
        width: dimensions.width,
        height: dimensions.height,
        isMobile: checkMobile(),
      });
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
