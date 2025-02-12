import { DatabaseContext } from "@/components/loaders/database-loader";
import { useContext } from "react";

/**
 * Gets the database context.
 *
 * @returns the database context
 */
export default function useDatabase() {
  return useContext(DatabaseContext)!;
}
