import { AuthConnectionsRepository } from "../../repositories/auth-connections.repository";

export class UserService {
  /**
   * Builds the signed-in user as the client sees it, including the platform accounts they linked.
   *
   * @param user the signed-in user
   */
  public static async getMe(user: {
    id: string;
    name: string;
    image?: string | null;
    playerId?: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      image: user.image ?? null,
      playerId: user.playerId ?? null,
      connections: await AuthConnectionsRepository.getByUserId(user.id),
    };
  }
}
