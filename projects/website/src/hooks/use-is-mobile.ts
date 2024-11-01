import { useEffect, useState } from "react";

export function useIsMobile(size = 1024) {
  const checkMobile = () => {
    return window.innerWidth <= size;
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
