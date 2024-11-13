type Country = {
  code: string;
  name: string;
};

/**
 * Gets a list of all countries.
 *
 * @returns a list of all countries
 */
export function getCountries() {
  const countryName = new Intl.DisplayNames(["en"], { type: "region" });
  const countries: Country[] = [];

  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const name = countryName.of(code);
      if (name && code !== name) {
        countries.push({ code, name });
      }
    }
  }

  return countries;
}
