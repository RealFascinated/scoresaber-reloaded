import { Type, type StaticDecode } from "typebox";

/**
 * The platforms a player can sign in with, named like ScoreSaber's connection providers.
 * Meta and Quest players are both `OCULUS`.
 */
export const AuthConnectionProviderSchema = Type.Union([Type.Literal("STEAM"), Type.Literal("OCULUS")]);
export type AuthConnectionProvider = StaticDecode<typeof AuthConnectionProviderSchema>;
