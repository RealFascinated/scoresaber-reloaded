import { useCallback } from "react";

export function usePageNavigation() {
  const changePageUrl = useCallback((newPage: string) => {
    const newState = { page: newPage };

    // Push new state and URL to history
    window.history.replaceState(newState, "", newPage);
  }, []);

  return { changePageUrl };
}
