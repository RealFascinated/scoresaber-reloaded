/**
 * Checks if a number is a whole number
 *
 * @param number the number to check
 * @returns whether the number is a whole number
 */
export function isWholeNumber(number: number) {
  return number % 1 === 0;
}

/**
 * Formats a number without trailing zeros.
 *
 * @param num the number to format
 * @returns the formatted number
 */
export function formatNumberWithCommas(num: number) {
  return num.toLocaleString();
}

/**
 * Formats the pp value
 *
 * @param num the pp to format
 * @returns the formatted pp
 */
export function formatPp(num: number) {
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
