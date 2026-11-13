import { Type } from "typebox";
import { Modifier } from "../../score/modifier";

export const ModifierSchema = Type.Enum(Modifier);

export const ModifiersSchema = Type.Array(ModifierSchema);
