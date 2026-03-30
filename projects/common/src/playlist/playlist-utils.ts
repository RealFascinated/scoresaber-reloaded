// /**
//  * Gets the URL of a playlist
//  *
//  * @param playlist the playlist
//  * @returns the URL of the playlist
//  */
// export function getPlaylistURL(playlist: Playlist): string {
//   const base = `${env.NEXT_PUBLIC_API_URL}/playlist/`;

//   if (playlist instanceof SnipePlaylist) {
//     return (
//       base +
//       `snipe?user=${playlist.userId}&toSnipe=${playlist.toSnipeId}&settings=${encodeSnipePlaylistSettings(playlist.settings)}`
//     );
//   }

//   if (playlist instanceof SelfPlaylist) {
//     return base + `self?user=${playlist.userId}&settings=${encodeSelfPlaylistSettings(playlist.settings)}`;
//   }

//   return base + playlist.id + ".bplist";
// }
