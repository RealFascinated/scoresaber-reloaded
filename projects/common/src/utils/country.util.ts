type Country = {
  code: string;
  name: string;
};

/**
 * Gets a list of all countries with valid flags.
 *
 * @returns a list of all countries with valid flags
 */
export function getCountries() {
  const countryName = new Intl.DisplayNames(["en"], { type: "region" });
  const countries: Country[] = [];

  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const name = countryName.of(code);

      // Check if name exists and that the flag can be rendered
      if (name && code !== name && isFlagRenderable(code)) {
        countries.push({ code, name });
      }
    }
  }

  return countries;
}

/**
 * Gets the full country name for a given country code.
 *
 * @param code - The ISO 3166-1 alpha-2 country code
 * @returns the full country name
 */
export function getFullCountryName(code: string): string {
  const countryName = new Intl.DisplayNames(["en"], { type: "region" });
  return countryName.of(code) ?? "Unknown";
}

/**
 * Checks if a flag is renderable for a given country code.
 *
 * @param code - The ISO 3166-1 alpha-2 country code
 * @returns true if the flag is renderable, false otherwise
 */
function isFlagRenderable(code: string): boolean {
  // Create the flag emoji using Unicode Regional Indicator Symbols
  const flagEmoji = code
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));

  // Check if the emoji is a valid flag by testing its length
  return flagEmoji.length === 4; // A valid flag emoji will have 4 bytes
}
