/**
 * Turns a song name and author into a YouTube link
 *
 * @param name the name of the song
 * @param songSubName the sub name of the song
 * @param author the author of the song
 * @returns the YouTube link for the song
 */
export function songNameToYouTubeLink(name: string, songSubName: string, author: string) {
  const baseUrl = "https://www.youtube.com/results?search_query=";
  let query = "";
  if (name) {
    query += `${name} `;
  }
  if (songSubName) {
    query += `${songSubName} `;
  }
  if (author) {
    query += `${author} `;
  }
  return encodeURI(baseUrl + query.trim().replaceAll(" ", "+"));
}
