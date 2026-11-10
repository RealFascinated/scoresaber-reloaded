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
        // Use singleton pattern
        if (!databaseInstance) {
          databaseInstance = getDatabase();
        }

        // Set database immediately for non-blocking access
        setDatabase(databaseInstance);

        // Initialize chart legends in background
        await databaseInstance.initializeChartLegends();
      } catch (err) {
        console.error("Failed to initialize database:", err);
        setError("Failed to load database");
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabase();
  }, []);

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
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
