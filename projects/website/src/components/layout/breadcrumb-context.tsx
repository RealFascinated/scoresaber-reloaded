"use client";

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";

type BreadcrumbContextValue = {
  /**
   * The label of the current page, used as the last crumb for dynamic routes (e.g. a player's name).
   */
  title: string | undefined;
  setTitle: Dispatch<SetStateAction<string | undefined>>;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | undefined>(undefined);

  return <BreadcrumbContext.Provider value={{ title, setTitle }}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Gets the title of the current page set via {@link useBreadcrumbTitle}.
 */
export function useBreadcrumbPageTitle(): string | undefined {
  return useContext(BreadcrumbContext)?.title;
}

/**
 * Sets the last crumb of the breadcrumb bar while the calling component is mounted.
 */
export function useBreadcrumbTitle(title: string | undefined) {
  const setTitle = useContext(BreadcrumbContext)?.setTitle;

  useEffect(() => {
    if (!setTitle) {
      return;
    }
    setTitle(title);
    return () => setTitle(undefined);
  }, [setTitle, title]);
}
