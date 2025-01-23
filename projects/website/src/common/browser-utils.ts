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

/**
 * Downloads a file from a URL
 *
 * @param url the URL to download
 * @param fileName the file name to download as
 */
export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url, {
      method: "get",
      mode: "no-cors",
      referrerPolicy: "no-referrer",
    });

    const blob = await response.blob();

    const aElement = document.createElement("a");
    aElement.setAttribute("download", fileName);

    const href = URL.createObjectURL(blob);
    aElement.href = href;
    aElement.setAttribute("target", "_blank");

    aElement.click();
    URL.revokeObjectURL(href);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
}
