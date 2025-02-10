/**
 * Copies the given string to the clipboard
 *
 * @param str the string to copy
 */
export function copyToClipboard(str: string) {
  navigator.clipboard.writeText(str);
}

/**
 * Opens a URL in a new tab
 */
export function openInNewTab(url: string) {
  window.open(url, "_blank");
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
      method: "GET",
      referrerPolicy: "no-referrer",
    });

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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

/**
 * Downloads a text file
 *
 * @param text the text to download
 * @param fileName the file name to download as
 */
export async function downloadTextFile(text: string, fileName: string) {
  const aElement = document.createElement("a");
  aElement.setAttribute("download", fileName);
  aElement.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  aElement.click();
}
