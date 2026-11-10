"use client";

import { cn } from "@/common/utils";
import { createContext, ReactNode, useContext } from "react";

/**
 * Controls rendered at the start of every scores toolbar (e.g. the platform tabs on the player page).
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
 * Header of a scores card.
 *
 * Layout:
 * - Header strip, flush with the card's top edge: the platform tabs (from context, or a plain "Scores"
 *   title when there is only one platform) on the left, `actions` (search, filters) on the right.
 * - Controls row: `children` (sort and type selectors), each group separated by a divider.
 */
export function ScoresToolbar({ actions, children }: { actions?: ReactNode; children?: ReactNode }) {
  const leading = useContext(ScoresToolbarLeadingContext);

  return (
    <div className="flex flex-col gap-3">
      {/* Bleeds over the card padding (Card is p-4) so the divider runs edge to edge like a card header */}
      <div className="border-border -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-4 border-b px-4">
        <div className="flex h-12 min-w-0 items-center">
          {leading ?? <h2 className="text-base font-semibold">Scores</h2>}
        </div>
        {actions && (
          <div className="flex w-full min-w-0 items-center gap-2 pb-3 sm:w-auto sm:pb-0">{actions}</div>
        )}
      </div>
      {children && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-4 gap-y-2",
            "[&>*+*]:border-border [&>*+*]:border-l [&>*+*]:pl-4"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
