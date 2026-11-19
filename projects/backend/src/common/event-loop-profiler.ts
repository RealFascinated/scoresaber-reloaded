import Logger from "@ssr/common/logger";
import { profile, type SamplingProfileStackFrame } from "bun:jsc";

const SAMPLE_INTERVAL_US = 1000;
const START_DELAY_MS = 60_000;
const RUN_GAP_S = 0.005;
const STALL_MIN_MS = 30;
const UNKNOWN_POSITION = 4294967295;
const PATH_DEPTH = 8;
const TOP_GROUPS = 12;
const TOP_LEAVES = 4;
const TOP_SELF = 15;
const LEAF_DEPTH = 3;

const log = Logger.withTopic("Event Loop Profiler");

type Trace = { timestamp: number; frames: SamplingProfileStackFrame[] };

type Stall = { durationMs: number; path: string; leaves: Map<string, number> };

function describeFrame(frame: SamplingProfileStackFrame) {
  const name = frame.name || "(anonymous)";
  if (!frame.sourceURL) {
    return `${name} [native]`;
  }
  const file = frame.sourceURL.replace(/^.*?\/(src|node_modules)\//, "$1/");
  const position = frame.line === UNKNOWN_POSITION ? `${name} (${file})` : `${name} (${file}:${frame.line})`;
  return frame.inliner
    ? `${position} inlined in ${frame.inliner.name || "(anonymous)"}:${frame.inliner.line}`
    : position;
}

function splitIntoRuns(traces: Trace[]) {
  const runs: Trace[][] = [];
  let current: Trace[] = [];
  for (const trace of traces) {
    const previous = current[current.length - 1];
    if (previous && trace.timestamp - previous.timestamp > RUN_GAP_S) {
      runs.push(current);
      current = [];
    }
    current.push(trace);
  }
  if (current.length > 0) {
    runs.push(current);
  }
  return runs;
}

function sharedRootPath(run: Trace[]) {
  const stacks = run.map(trace => trace.frames.map(describeFrame).reverse());
  const shared: string[] = [];
  for (let depth = 0; ; depth++) {
    const frame = stacks[0][depth];
    if (frame === undefined || stacks.some(stack => stack[depth] !== frame)) {
      break;
    }
    shared.push(frame);
  }
  return shared.slice(-PATH_DEPTH).reverse().join(" < ");
}

function countLeaves(traces: Trace[], depth: number) {
  const leaves = new Map<string, number>();
  for (const trace of traces) {
    const leaf =
      trace.frames.length > 0 ? trace.frames.slice(0, depth).map(describeFrame).join(" < ") : "(idle)";
    leaves.set(leaf, (leaves.get(leaf) ?? 0) + 1);
  }
  return leaves;
}

function topEntries(counts: Map<string, number>, limit: number) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function summarize(traces: Trace[], intervalS: number, seconds: number) {
  const stalls: Stall[] = splitIntoRuns(traces)
    .map(run => ({
      durationMs: (run[run.length - 1].timestamp - run[0].timestamp + intervalS) * 1000,
      path: sharedRootPath(run),
      leaves: countLeaves(run, LEAF_DEPTH),
    }))
    .filter(stall => stall.durationMs >= STALL_MIN_MS);

  const groups = new Map<
    string,
    { count: number; totalMs: number; maxMs: number; leaves: Map<string, number> }
  >();
  for (const stall of stalls) {
    const key = stall.path || "(no shared frames)";
    const group = groups.get(key) ?? { count: 0, totalMs: 0, maxMs: 0, leaves: new Map<string, number>() };
    group.count++;
    group.totalMs += stall.durationMs;
    group.maxMs = Math.max(group.maxMs, stall.durationMs);
    for (const [leaf, samples] of stall.leaves) {
      group.leaves.set(leaf, (group.leaves.get(leaf) ?? 0) + samples);
    }
    groups.set(key, group);
  }

  const lines = [
    `Profiled ${seconds}s: ${traces.length} samples (${(traces.length * intervalS * 1000).toFixed(0)}ms of JS), ${stalls.length} stalls >= ${STALL_MIN_MS}ms totalling ${stalls.reduce((sum, stall) => sum + stall.durationMs, 0).toFixed(0)}ms`,
    `Longest stalls: ${stalls
      .map(stall => stall.durationMs)
      .sort((a, b) => b - a)
      .slice(0, 10)
      .map(ms => `${ms.toFixed(0)}ms`)
      .join(", ")}`,
    "Stall groups by shared call path (innermost first):",
  ];
  for (const [path, group] of [...groups.entries()]
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, TOP_GROUPS)) {
    lines.push(
      `- ${group.count}x total=${group.totalMs.toFixed(0)}ms max=${group.maxMs.toFixed(0)}ms path: ${path}`,
      ...topEntries(group.leaves, TOP_LEAVES).map(([leaf, samples]) => `    ${samples} samples in ${leaf}`)
    );
  }
  lines.push("Top self time across all samples:");
  lines.push(
    ...topEntries(countLeaves(traces, 1), TOP_SELF).map(([leaf, samples]) => `  ${samples} ${leaf}`)
  );
  return lines.join("\n");
}

/**
 * Samples the main thread with JavaScriptCore's profiler for a while after startup and logs the longest
 * event loop stalls grouped by the call path they share.
 *
 * @param seconds how long to sample for
 */
export async function profileEventLoop(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`PROFILE_EVENT_LOOP_SECONDS must be a positive number of seconds, got "${seconds}"`);
  }
  await Bun.sleep(START_DELAY_MS);
  log.info(`Sampling the event loop for ${seconds}s...`);
  const { stackTraces } = await profile(() => Bun.sleep(seconds * 1000), SAMPLE_INTERVAL_US);
  log.info(summarize(stackTraces.traces, stackTraces.interval, seconds));
}
