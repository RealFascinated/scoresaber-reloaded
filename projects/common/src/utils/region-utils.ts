const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function normalizedRegionName(region: string) {
  try {
    return regionNames.of(region) || region;
  } catch {
    return region;
  }
}
