import { useEffect, useState } from "react";

export function useIsMobile() {
  const checkMobile = () => {
    return window.innerWidth < 768;
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
