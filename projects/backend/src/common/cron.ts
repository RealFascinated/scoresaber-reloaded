import { Cron } from "croner";
import { Elysia } from "elysia";

type CronPluginOptions = {
  /**
   * Unique name of the job, also used as the plugin name.
   */
  name: string;

  /**
   * The cron pattern to run the job on.
   */
  pattern: string;

  /**
   * The timezone the pattern is evaluated in.
   */
  timezone?: string;

  /**
   * Skip a run if the previous one is still running.
   */
  protect?: boolean;

  /**
   * The job to run.
   */
  run: () => void | Promise<void>;
};

/**
 * Elysia plugin that runs a cron job for the lifetime of the app.
 *
 * `@elysiajs/cron` is not compatible with Elysia 2, so this wraps `croner` (which it is built on)
 * directly. The job is stopped when the app stops.
 *
 * @param options the cron job options
 * @returns an Elysia plugin
 */
export function cron({ name, pattern, timezone, protect, run }: CronPluginOptions): Elysia {
  const job = new Cron(pattern, { name, timezone, protect }, run);
  return new Elysia({ name: `cron-${name}` }).onStop(() => {
    job.stop();
  });
}
