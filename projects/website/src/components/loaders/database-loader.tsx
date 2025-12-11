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

// Singleton database instance - also store on window for persistence across module reloads
let databaseInstance: Database | undefined;

// Type declaration for window
declare global {
  interface Window {
    __ssrDatabase?: Database;
  }
}

function getDatabaseInstance(): Database | undefined {
  if (isServer()) return undefined;
  // Check window first (persists across module reloads in production)
  if (typeof window !== "undefined" && window.__ssrDatabase) {
    databaseInstance = window.__ssrDatabase;
    return window.__ssrDatabase;
  }
  return databaseInstance;
}

export default function DatabaseLoader({ children }: DatabaseLoaderProps) {
  // Check if database already exists synchronously to prevent flash
  const existingDatabase = getDatabaseInstance();

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

        // Store on window for persistence across module reloads (production code splitting)
        if (typeof window !== "undefined") {
          window.__ssrDatabase = databaseInstance;
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
