/**
 * Copies the given string to the clipboard
 *
 * @param str the string to copy
 */
export function copyToClipboard(str: string) {
  navigator.clipboard.writeText(str);
}

/**
 * Checks if the current context is a worker
 */
export function isRunningAsWorker() {
  if (typeof window === "undefined") {
    return false;
  }
  return navigator.constructor.name === "WorkerNavigator";
}
