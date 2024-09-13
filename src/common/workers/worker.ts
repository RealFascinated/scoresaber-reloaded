import * as Comlink from "comlink";
import { scoresaberFetcher } from "@/common/data-fetcher/impl/scoresaber";

export interface WorkerApi {
  getName: typeof getName;
}

const workerApi: WorkerApi = {
  getName,
};

async function getName() {
  return await scoresaberFetcher.lookupPlayer("76561198449412074");
}

Comlink.expose(workerApi);
