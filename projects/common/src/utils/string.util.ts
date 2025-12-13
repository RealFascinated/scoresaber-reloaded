/**
 * Generates a random string
 *
 * @param length the length of the string
 * @returns the random string
 */
export function randomString(length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Pluralizes a string.
 *
 * @param count the count of the string
 * @param word the word to pluralize
 * @returns the pluralized string
 */
export function pluralize(count: number, word: string) {
  return count === 1 ? word : `${word}s`;
}