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
 * @param fractionDigits the amount of fraction digits
 * @returns the formatted pp
 */
export function formatPp(num: number, fractionDigits: number = 2) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Formats the number
 *
 * @param num the number to format
 * @param type the type of number to format
 * @returns the formatted number
 */
export function formatNumber(num: number, type: "number" | "pp" = "number") {
  if (type == "pp") {
    return formatPp(num);
  }
  return formatNumberWithCommas(num);
}

/**
 * Ensures a number is always positive
 *
 * @param num the number to ensure
 * @returns the positive number
 */
export function ensurePositiveNumber(num: number) {
  if (num == -0) {
    return 0;
  }
  return num < 0 ? num * -1 : num;
}
