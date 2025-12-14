import Request from "./request";

/**
 * Gets the health of the api server.
 *
 * @param url the url of the api
 */
export async function getApiHealth(url: string): Promise<boolean> {
  try {
    await Request.get(`${url}/health`);
    return true;
  } catch {
    return false;
  }
}
