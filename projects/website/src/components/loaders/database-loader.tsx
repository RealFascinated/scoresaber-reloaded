"use client";

import { isServer } from "@ssr/common/utils/utils";
import { createContext, ReactNode, useEffect, useRef, useState } from "react";
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
  // Check if database already exists synchronously to prevent flash
  const existingDatabase = !isServer() && databaseInstance ? databaseInstance : undefined;

  const [database, setDatabase] = useState<Database | undefined>(existingDatabase);
  const [isLoading, setIsLoading] = useState(!existingDatabase);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(!!existingDatabase);

  useEffect(() => {
    if (isServer()) {
      setIsLoading(false);
      return;
    }

    // Skip if already initialized (prevents re-initialization on remounts)
    if (hasInitialized.current) {
      return;
    }

    const initializeDatabase = async () => {
      try {
        // Use singleton pattern
        if (!databaseInstance) {
          databaseInstance = getDatabase();
        }

        // Set database immediately for non-blocking access
        setDatabase(databaseInstance);
        hasInitialized.current = true;

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
          <p className="mb-4 text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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
