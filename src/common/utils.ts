import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if the url is valid
 *
 * @param url the url to validate
 * @returns true if the url is valid, false otherwise
 */
export function validateUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
