import { z } from "zod";

export enum Modifier {
  NF = "NF",
  PM = "PM",
  FS = "FS",
  SF = "SF",
  SS = "SS",
  GN = "GN",
  DA = "DA",
  SA = "SA",
  SC = "SC",
  IF = "IF",
  NO = "NO",
  BE = "BE",
  NB = "NB",
  NA = "NA",
}

/**
 * Maps a modifier code to its human-readable label.
 */
export const ModifierLabels: Readonly<Record<Modifier, string>> = {
  [Modifier.NF]: "No Fail",
  [Modifier.PM]: "Pro Mode",
  [Modifier.FS]: "Faster Song",
  [Modifier.SF]: "Super Fast Song",
  [Modifier.SS]: "Slower Song",
  [Modifier.GN]: "Ghost Notes",
  [Modifier.DA]: "Disappearing Arrows",
  [Modifier.SA]: "Strict Angles",
  [Modifier.SC]: "Small Notes",
  [Modifier.IF]: "One Life",
  [Modifier.NO]: "No Obstacles",
  [Modifier.BE]: "Battery Energy",
  [Modifier.NB]: "No Bombs",
  [Modifier.NA]: "No Arrows",
};

const modifierByLabel: Readonly<Record<string, Modifier>> = Object.freeze(
  Object.fromEntries(
    Object.entries(ModifierLabels).map(([code, label]) => [label, code as Modifier])
  ) as Record<string, Modifier>
);

/**
 * Zod schema for a single modifier code.
 */
export const ModifierSchema = z.enum(Modifier);

/**
 * Zod schema for a list of modifier codes.
 */
export const ModifiersSchema = z.array(ModifierSchema);

/**
 * Normalizes a modifier value (code or legacy label) into a modifier code.
 */
export function normalizeModifier(value: string): Modifier | undefined {
  const parsed = ModifierSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  // Legacy DB/UI values stored as labels (e.g. "No Fail")
  return modifierByLabel[value];
}

/**
 * Normalizes a list of modifier values (codes or legacy labels) into modifier codes.
 */
export function normalizeModifiers(values: readonly string[] | undefined): Modifier[] {
  if (!values || values.length === 0) {
    return [];
  }

  const out: Modifier[] = [];
  for (const value of values) {
    const normalized = normalizeModifier(value);
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

/**
 * Checks whether a modifier list contains a given modifier (supports codes or legacy labels).
 */
export function hasModifier(values: readonly string[] | undefined, modifier: Modifier): boolean {
  if (!values || values.length === 0) {
    return false;
  }

  for (const value of values) {
    if (normalizeModifier(value) === modifier) {
      return true;
    }
  }
  return false;
}

/**
 * Gets a human-readable label for a modifier (accepts codes or legacy labels).
 */
export function getModifierLabel(value: string): string {
  const normalized = normalizeModifier(value);
  return normalized ? ModifierLabels[normalized] : value;
}
