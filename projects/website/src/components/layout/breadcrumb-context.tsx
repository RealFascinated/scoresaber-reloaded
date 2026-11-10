"use client";

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";

type SetBreadcrumbTitle = Dispatch<SetStateAction<string | undefined>>;

// Split in two so the pages that set the title (which are heavy) don't re-render when the title they set
// changes; only the header that displays it reads the title.
const BreadcrumbTitleContext = createContext<string | undefined>(undefined);
const BreadcrumbSetTitleContext = createContext<SetBreadcrumbTitle | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  /**
   * The label of the current page, used as the last crumb for dynamic routes (e.g. a player's name).
   */
  const [title, setTitle] = useState<string | undefined>(undefined);

  return (
    <BreadcrumbSetTitleContext.Provider value={setTitle}>
      <BreadcrumbTitleContext.Provider value={title}>{children}</BreadcrumbTitleContext.Provider>
    </BreadcrumbSetTitleContext.Provider>
  );
}

/**
 * Gets the title of the current page set via {@link useBreadcrumbTitle}.
 */
export function useBreadcrumbPageTitle(): string | undefined {
  return useContext(BreadcrumbTitleContext);
}

/**
 * Sets the last crumb of the breadcrumb bar while the calling component is mounted.
 */
export function useBreadcrumbTitle(title: string | undefined) {
  const setTitle = useContext(BreadcrumbSetTitleContext);

  useEffect(() => {
    if (!setTitle) {
      return;
    }
    setTitle(title);
    return () => setTitle(undefined);
  }, [setTitle, title]);
}
