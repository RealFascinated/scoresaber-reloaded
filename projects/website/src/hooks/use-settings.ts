import { useContext } from "react";
import { SettingsContext } from "@/components/loaders/database-loader";

/**
 * Gets the settings context.
 *
 * @returns the settings context
 */
export default function useSettings() {
  return useContext(SettingsContext)!;
}
