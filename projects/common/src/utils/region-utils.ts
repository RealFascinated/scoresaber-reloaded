const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Returns the normalized region name
 *
 * @param region the region to normalize
 * @returns the normalized region name
 */
export function normalizedRegionName(region: string) {
  try {
    return regionNames.of(region) || region;
  } catch {
    return region;
  }
}
