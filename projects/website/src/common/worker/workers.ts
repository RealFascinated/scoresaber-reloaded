import * as Comlink from "comlink";
import { WorkerApi } from "@/common/worker/worker";

export const scoresaberReloadedWorker = () =>
  Comlink.wrap<WorkerApi>(new Worker(new URL("./worker.ts", import.meta.url)));
