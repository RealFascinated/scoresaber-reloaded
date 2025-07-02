"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, ReactNode, useContext } from "react";

interface PreviewContextProps {
  playerPreviews: boolean;
  leaderboardPreviews: boolean;
}

const PreviewContext = createContext<PreviewContextProps | undefined>(undefined);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const database = useDatabase();
  const playerPreviews = useLiveQuery(async () => await database.getPlayerPreviews(), []);
  const leaderboardPreviews = useLiveQuery(async () => await database.getLeaderboardPreviews(), []);

  return (
    <PreviewContext.Provider
      value={{
        playerPreviews: playerPreviews ?? true,
        leaderboardPreviews: leaderboardPreviews ?? true,
      }}
    >
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("usePreview must be used within a PreviewProvider");
  return context;
}
