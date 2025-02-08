"use client";

import { createContext, ReactNode, useState } from "react";
import Database, { getDatabase } from "../../common/database/database";
import FullscreenLoader from "./fullscreen-loader";

/**
 * The context for the database. This is used to access the database from within the app.
 */
export const DatabaseContext = createContext<Database | undefined>(undefined);

type DatabaseLoaderProps = {
  /**
   * The children to render.
   */
  children: ReactNode;
};

export default function DatabaseLoader({ children }: DatabaseLoaderProps) {
  const [database] = useState<Database | undefined>(getDatabase());

  return (
    <DatabaseContext.Provider value={database}>
      {database == undefined ? <FullscreenLoader reason="Loading database..." /> : children}
    </DatabaseContext.Provider>
  );
}
