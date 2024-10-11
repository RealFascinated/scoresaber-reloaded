"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import Database, { db } from "../../common/database/database";
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
  const [database, setDatabase] = useState<Database | undefined>(undefined);

  useEffect(() => {
    const before = performance.now();
    setDatabase(db);

    db.on("ready", () => {
      const loadTime = (performance.now() - before).toFixed(0);
      console.log(`Loaded database in ${loadTime}ms`);
    });
  }, []);

  return (
    <DatabaseContext.Provider value={database}>
      {database == undefined ? <FullscreenLoader reason="Loading database..." /> : children}
    </DatabaseContext.Provider>
  );
}
