import { Type, type StaticDecode } from "typebox";
import { AuthConnectionProviderSchema } from "../../auth/connection-provider";

export const AuthConnectionSchema = Type.Object({
  provider: AuthConnectionProviderSchema,
  /** The player id on that platform. */
  id: Type.String(),
  /** The primary connection's id is the public player id. */
  isPrimary: Type.Boolean(),
});
export type AuthConnection = StaticDecode<typeof AuthConnectionSchema>;

export const AuthMeResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  image: Type.Union([Type.String(), Type.Null()]),
  /** The public player id (the primary connection's id), also the ScoreSaber player id. */
  playerId: Type.Union([Type.String(), Type.Null()]),
  connections: Type.Array(AuthConnectionSchema),
});
export type AuthMeResponse = StaticDecode<typeof AuthMeResponseSchema>;
