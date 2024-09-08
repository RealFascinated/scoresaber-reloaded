import { useContext } from "react";
import { DatabaseContext } from "../components/loaders/database-loader";

/**
 * Gets the database context.
 *
 * @returns the database context
 */
export default function useDatabase() {
  return useContext(DatabaseContext)!;
}
