"use client";

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";

interface PageTransitionContextType {
  currentPage: number;
  direction: number;
  animateLeft: () => void;
  animateRight: () => void;
  reset: () => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextType | null>(null);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [[currentPage, direction], setPage] = useState([1, 0]);
  const [isLoading, setIsLoading] = useState(false);
  const prevPageRef = useRef(1);

  const animateLeft = useCallback(() => {
    setPage([prevPageRef.current + 1, 1]);
    prevPageRef.current = prevPageRef.current + 1;
  }, []);

  const animateRight = useCallback(() => {
    setPage([prevPageRef.current - 1, -1]);
    prevPageRef.current = prevPageRef.current - 1;
  }, []);

  const reset = useCallback(() => {
    setPage([1, 0]);
    prevPageRef.current = 1;
  }, []);

  return (
    <PageTransitionContext.Provider
      value={{
        currentPage,
        direction,
        animateLeft,
        animateRight,
        reset,
        setIsLoading,
        isLoading,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider");
  }
  return context;
}
