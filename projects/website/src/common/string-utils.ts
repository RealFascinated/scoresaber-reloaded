/**
 * Capitalizes the first letter of a string.
 *
 * @param str the string to capitalize
 * @returns the capitalized string
 */
export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncateText(text: string | undefined, maxLength: number): string | undefined {
  if (!text) {
    return undefined;
  }
  return text.length > maxLength ? text.slice(0, maxLength - 3).trim() + "..." : text;
}
