"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import Database, { getDatabase } from "../../common/database/database";
import FullscreenLoader from "./fullscreen-loader";
import { isServer } from "@ssr/common/utils/utils";

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
  const [database, setDatabase] = useState<Database | undefined>();

  useEffect(() => {
    if (isServer()) {
      return;
    }
    const db = getDatabase();
    if (db) {
      db.initializeChartLegends().then(() => {
        setDatabase(db);
      });
    }
  }, []);

  return (
    <DatabaseContext.Provider value={database}>
      {database == undefined && !isServer() ? (
        <FullscreenLoader reason="Loading database..." />
      ) : (
        children
      )}
    </DatabaseContext.Provider>
  );
}
