import { useEffect, useState } from "react";

export function useIsMobile() {
  const checkMobile = () => {
    // Check for mobile user agent
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Check for small screen width (common mobile breakpoint)
    const isSmallScreen = window.innerWidth < 768;

    // Return true if either condition is met
    return isMobileUserAgent || isSmallScreen;
  };

  const [isMobile, setIsMobile] = useState(checkMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Check on mount
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}
