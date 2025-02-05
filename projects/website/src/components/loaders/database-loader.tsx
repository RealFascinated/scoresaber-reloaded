"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import Database, { db } from "../../common/database/database";
import FullscreenLoader from "./fullscreen-loader";
import Settings from "@/common/database/impl/settings";
import { useLiveQuery } from "dexie-react-hooks";
import Logger from "@ssr/common/logger";

/**
 * The context for the database. This is used to access the database from within the app.
 */
export const DatabaseContext = createContext<Database | undefined>(undefined);
export const SettingsContext = createContext<Settings | undefined>(undefined);

type DatabaseLoaderProps = {
  /**
   * The children to render.
   */
  children: ReactNode;
};

export default function DatabaseLoader({ children }: DatabaseLoaderProps) {
  const [database, setDatabase] = useState<Database | undefined>(undefined);
  const settings = useLiveQuery(() => db.getSettings());

  const loadDatabase = async () => {
    setDatabase(db);
  };

  useEffect(() => {
    const before = performance.now();
    loadDatabase().then(() => {
      db.on("ready", () => {
        const loadTime = (performance.now() - before).toFixed(0);
        Logger.info(`Loaded database in ${loadTime}ms`);
      });
    });
  }, []);

  return (
    <DatabaseContext.Provider value={database}>
      <SettingsContext.Provider value={settings}>
        {database == undefined || settings == undefined ? (
          <FullscreenLoader reason="Loading database..." />
        ) : (
          children
        )}
      </SettingsContext.Provider>
    </DatabaseContext.Provider>
  );
}
