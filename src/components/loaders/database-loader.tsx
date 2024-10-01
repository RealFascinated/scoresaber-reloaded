"use client";

import { createContext, useEffect, useState } from "react";
import Database, { db } from "../../common/database/database";
import FullscreenLoader from "./fullscreen-loader";
import { useToast } from "@/hooks/use-toast";

/**
 * The context for the database. This is used to access the database from within the app.
 */
export const DatabaseContext = createContext<Database | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export default function DatabaseLoader({ children }: Props) {
  const { toast } = useToast();
  const [database, setDatabase] = useState<Database | undefined>(undefined);

  useEffect(() => {
    const before = performance.now();
    setDatabase(db);
    console.log(`Loaded database in ${performance.now() - before}ms`);

    db.on("ready", () => {
      toast({
        title: "Database loaded",
        description: `The database was loaded in ${performance.now() - before}ms.`,
      });
    });
  }, [toast]);

  return (
    <DatabaseContext.Provider value={database}>
      {database == undefined ? <FullscreenLoader reason="Loading database..." /> : children}
    </DatabaseContext.Provider>
  );
}
