import Logger from "@ssr/common/logger";

export function copyToClipboard(str: string) {
  navigator.clipboard.writeText(str);
}

export function openInNewTab(url: string) {
  window.open(url, "_blank");
}

export async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      referrerPolicy: "no-referrer",
    });

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
    Logger.error("Error downloading file:", error);
  }
}
