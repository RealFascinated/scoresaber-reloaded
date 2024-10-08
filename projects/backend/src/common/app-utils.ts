/**
 * Gets the app version.
 */
export function getAppVersion() {
  if (!process.env.APP_VERSION) {
    const packageJson = require("../../package.json");
    process.env.APP_VERSION = packageJson.version;
  }
  return process.env.APP_VERSION + "-" + (process.env.GIT_REV?.substring(0, 7) ?? "dev");
}
