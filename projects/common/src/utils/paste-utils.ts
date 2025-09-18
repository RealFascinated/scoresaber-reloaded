/**
 * Uploads a paste to paste.fascinated.cc
 *
 * @param content the content of the paste
 * @returns the paste URL
 * @throws an error if the paste fails to upload
 */
export async function uploadPaste(content: string): Promise<string> {
  const response = await fetch("https://paste.fascinated.cc/api/upload", {
    method: "POST",
    body: content,
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message);
  }

  return `https://paste.fascinated.cc/${json.key}`;
}
