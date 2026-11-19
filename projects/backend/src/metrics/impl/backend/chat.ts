import { Counter, Histogram } from "@prometheus-io/client";
import Metric from "../../metric";
import { MetricType, prometheusRegistry } from "../../prometheus";

export type ChatTurnOutcome = "ok" | "aborted" | "error";
export type ChatTokenKind = "input" | "output";

export default class ChatMetric extends Metric<number> {
  private readonly turns: Counter<"outcome">;
  private readonly turnDuration: Histogram<"outcome">;
  private readonly toolCalls: Counter<"tool" | "outcome">;
  private readonly compactions: Counter<"outcome">;
  private readonly errors: Counter<"stage">;
  private readonly tokens: Counter<"kind">;

  constructor() {
    super(MetricType.CHAT, 0, { persist: false });

    this.turns = new Counter<"outcome">({
      name: "chat_turns_total",
      help: "Chat turns by outcome",
      labelNames: ["outcome"],
      registers: [prometheusRegistry],
    });
    this.turnDuration = new Histogram<"outcome">({
      name: "chat_turn_duration_ms",
      help: "Duration of a chat turn in milliseconds",
      labelNames: ["outcome"],
      buckets: [250, 500, 1000, 2500, 5000, 10000, 20000, 40000, 80000],
      registers: [prometheusRegistry],
    });
    this.toolCalls = new Counter<"tool" | "outcome">({
      name: "chat_tool_calls_total",
      help: "Chat tool calls by tool name and outcome",
      labelNames: ["tool", "outcome"],
      registers: [prometheusRegistry],
    });
    this.compactions = new Counter<"outcome">({
      name: "chat_compactions_total",
      help: "Chat context compactions by outcome",
      labelNames: ["outcome"],
      registers: [prometheusRegistry],
    });
    this.errors = new Counter<"stage">({
      name: "chat_errors_total",
      help: "Chat errors by stage",
      labelNames: ["stage"],
      registers: [prometheusRegistry],
    });
    this.tokens = new Counter<"kind">({
      name: "chat_tokens_total",
      help: "Tokens reported by the chat provider",
      labelNames: ["kind"],
      registers: [prometheusRegistry],
    });
  }

  public observeTurn(outcome: ChatTurnOutcome, durationMs: number) {
    this.value = durationMs;
    this.turns.inc({ outcome });
    this.turnDuration.observe({ outcome }, durationMs);
  }

  public observeToolCall(tool: string, outcome: "ok" | "error") {
    this.toolCalls.inc({ tool, outcome });
  }

  public observeCompaction(outcome: "ok" | "error") {
    this.compactions.inc({ outcome });
  }

  public observeError(stage: "turn" | "compaction" | "title" | "persist") {
    this.errors.inc({ stage });
  }

  public observeTokens(kind: ChatTokenKind, count: number) {
    if (count > 0) {
      this.tokens.inc({ kind }, count);
    }
  }
}
