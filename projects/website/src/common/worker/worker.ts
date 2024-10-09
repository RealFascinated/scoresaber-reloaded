import * as Comlink from "comlink";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";

export interface WorkerApi {
  getPlayerExample: typeof getPlayerExample;
}

const workerApi: WorkerApi = {
  getPlayerExample: getPlayerExample,
};

async function getPlayerExample() {
  return await scoresaberService.lookupPlayer("76561198449412074");
}

Comlink.expose(workerApi);
