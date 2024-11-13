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
 * Downloads the given file
 *
 * @param url The URL of the file to download
 * @param filename The name to save the file as
 */
export async function downloadFile(url: string, filename: string) {
  try {
    // Fetch the file as a Blob
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();

    // Create a URL for the Blob and download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl); // Free up memory
  } catch (error) {
    console.error("Download failed:", error);
  }
}
