/**
 * Copies the given string to the clipboard
 *
 * @param str the string to copy
 */
export function copyToClipboard(str: string) {
  navigator.clipboard.writeText(str);
}
