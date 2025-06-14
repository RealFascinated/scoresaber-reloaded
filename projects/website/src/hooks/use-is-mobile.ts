import { useEffect, useState } from "react";

export function useIsMobile() {
  const checkMobile = () => {
    // Check for touch capabilities and mobile user agent
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return hasTouch && isMobileUserAgent;
  };

  const [isMobile, setIsMobile] = useState(checkMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}
