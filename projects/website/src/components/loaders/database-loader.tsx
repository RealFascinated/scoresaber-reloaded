"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
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

// Singleton database instance
let databaseInstance: Database | undefined;

export default function DatabaseLoader({ children }: DatabaseLoaderProps) {
  const [database, setDatabase] = useState<Database | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        if (!databaseInstance) {
          databaseInstance = getDatabase();
        }

        setDatabase(databaseInstance);
        setIsLoading(false);

        void databaseInstance.initializeChartLegends().catch(err => {
          console.error("Failed to initialize chart legends:", err);
        });
      } catch (err) {
        console.error("Failed to initialize database:", err);
        setError("Failed to load database");
        setIsLoading(false);
      }
    };

    void initializeDatabase();
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-sm bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <DatabaseContext.Provider value={database}>
      {isLoading ? <FullscreenLoader reason="Loading database..." /> : children}
    </DatabaseContext.Provider>
  );
}
