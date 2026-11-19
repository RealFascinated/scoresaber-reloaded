export interface ChatToolContext {
  userId: string;
  userName: string;
  /** The signed-in user's linked player id, null when they have not linked a profile */
  playerId: string | null;
  realmId: number;
}
