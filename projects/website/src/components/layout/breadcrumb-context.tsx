"use client";

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";

type SetBreadcrumbTitle = Dispatch<SetStateAction<string | undefined>>;

const BreadcrumbTitleContext = createContext<string | undefined>(undefined);
const BreadcrumbSetTitleContext = createContext<SetBreadcrumbTitle | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
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
export function useBreadcrumbPageTitle() {
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
