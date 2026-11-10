"use client";

import { createContext, ReactNode, useContext } from "react";

/**
 * Controls rendered at the start of every scores toolbar (e.g. the platform selector on the player page).
 */
const ScoresToolbarLeadingContext = createContext<ReactNode>(undefined);

export function ScoresToolbarLeadingProvider({
  leading,
  children,
}: {
  leading: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScoresToolbarLeadingContext.Provider value={leading}>{children}</ScoresToolbarLeadingContext.Provider>
  );
}

/**
 * A single row of controls shown above a scores list.
 */
export function ScoresToolbar({ children }: { children: ReactNode }) {
  const leading = useContext(ScoresToolbarLeadingContext);

  return (
    <div className="border-border/50 flex flex-wrap items-center gap-2 border-b pb-3">
      {leading}
      {children}
    </div>
  );
}
