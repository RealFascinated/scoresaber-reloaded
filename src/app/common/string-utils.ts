/**
 * Capitalizes the first letter of a string.
 *
 * @param str the string to capitalize
 * @returns the capitalized string
 */
export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
