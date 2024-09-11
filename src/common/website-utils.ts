/**
 * Sets the player id cookie
 *
 * @param playerId the player id to set
 */
export function setPlayerIdCookie(playerId: string) {
  document.cookie = `playerId=${playerId}`;
}
