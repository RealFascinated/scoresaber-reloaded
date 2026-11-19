import { jsonSchema } from "ai";
import { describe, expect, it } from "bun:test";
import { ChatContextService, type ChatContextMessage } from "./chat-context.service";

function message(ordinal: number, role: "user" | "assistant", tokenEstimate: number) {
  const part = { type: "text", text: `message ${ordinal}` };
  return { ordinal, role, tokenEstimate, parts: [part] } satisfies ChatContextMessage;
}

describe("ChatContextService.estimateTokens", () => {
  it("estimates chars / 4 rounded up", () => {
    expect(ChatContextService.estimateTokens("")).toBe(0);
    expect(ChatContextService.estimateTokens("abcd")).toBe(1);
    expect(ChatContextService.estimateTokens("abcde")).toBe(2);
  });
});

describe("ChatContextService.getBudget", () => {
  it("subtracts the system prompt and a 20% reply reserve", () => {
    expect(ChatContextService.getBudget(10_000, 2_000)).toBe(6_400);
  });

  it("never goes negative", () => {
    expect(ChatContextService.getBudget(1_000, 5_000)).toBe(0);
  });
});

describe("ChatContextService.planCompaction", () => {
  it("does nothing while under 80% of the budget", () => {
    const history = [message(1, "user", 100), message(2, "assistant", 100)];
    expect(
      ChatContextService.planCompaction({ history, newMessageTokens: 100, summaryTokens: 0, budget: 1000 })
    ).toEqual({ type: "none" });
  });

  it("rejects a new message that cannot fit the budget", () => {
    expect(
      ChatContextService.planCompaction({
        history: [],
        newMessageTokens: 1001,
        summaryTokens: 0,
        budget: 1000,
      })
    ).toEqual({ type: "too-large" });
  });

  it("folds the oldest messages and keeps the recent ones within 40% of the budget", () => {
    const history = [
      message(1, "user", 200),
      message(2, "assistant", 200),
      message(3, "user", 100),
      message(4, "assistant", 100),
      message(5, "user", 100),
      message(6, "assistant", 100),
    ];
    const plan = ChatContextService.planCompaction({
      history,
      newMessageTokens: 100,
      summaryTokens: 0,
      budget: 1000,
    });

    expect(plan).toEqual({ type: "compact", foldCount: 4 });
  });

  it("starts the kept messages on a user message", () => {
    const history = [
      message(1, "user", 400),
      message(2, "assistant", 100),
      message(3, "user", 100),
      message(4, "assistant", 100),
    ];
    const plan = ChatContextService.planCompaction({
      history,
      newMessageTokens: 200,
      summaryTokens: 0,
      budget: 800,
    });

    expect(plan).toEqual({ type: "compact", foldCount: 4 });
  });

  it("counts the existing summary towards the threshold", () => {
    const history = [message(1, "user", 300), message(2, "assistant", 300)];
    const plan = ChatContextService.planCompaction({
      history,
      newMessageTokens: 100,
      summaryTokens: 300,
      budget: 1000,
    });

    expect(plan.type).toBe("compact");
  });
});

describe("ChatContextService.buildTranscript", () => {
  it("stubs tool results with the tool name and arguments", () => {
    const question = { type: "text", text: "my rank?" };
    const toolCall = {
      type: "tool-getPlayer",
      input: { playerId: "1" },
      output: { huge: "x".repeat(10_000) },
    };
    const answer = { type: "text", text: "You are rank 5" };
    const transcript = ChatContextService.buildTranscript(
      [
        { ordinal: 1, role: "user", tokenEstimate: 1, parts: [question] },
        {
          ordinal: 2,
          role: "assistant",
          tokenEstimate: 1,
          parts: [toolCall, answer],
        },
      ],
      10_000
    );

    expect(transcript).toContain("User: my rank?");
    expect(transcript).toContain('[tool getPlayer({"playerId":"1"}): result omitted]');
    expect(transcript).toContain("You are rank 5");
    expect(transcript).not.toContain("xxxx");
  });

  it("keeps the tail when over the character cap", () => {
    const transcript = ChatContextService.buildTranscript(
      [message(1, "user", 1), message(2, "assistant", 1)],
      30
    );

    expect(transcript.length).toBe(30);
    expect(transcript.endsWith("message 2")).toBe(true);
  });
});

describe("ChatContextService.trimToBudget", () => {
  it("keeps everything that fits", () => {
    const history = [message(1, "user", 10), message(2, "assistant", 10)];
    expect(
      ChatContextService.trimToBudget({ history, newMessageTokens: 10, summaryTokens: 0, budget: 100 })
    ).toEqual(history);
  });

  it("drops the oldest messages and starts on a user message", () => {
    const history = [
      message(1, "user", 40),
      message(2, "assistant", 40),
      message(3, "user", 40),
      message(4, "assistant", 40),
    ];
    const trimmed = ChatContextService.trimToBudget({
      history,
      newMessageTokens: 10,
      summaryTokens: 10,
      budget: 100,
    });
    expect(trimmed.map(item => item.ordinal)).toEqual([3, 4]);
  });

  it("drops the whole history when nothing fits", () => {
    const history = [message(1, "user", 90)];
    expect(
      ChatContextService.trimToBudget({ history, newMessageTokens: 50, summaryTokens: 0, budget: 100 })
    ).toEqual([]);
  });
});

describe("ChatContextService.measureTools", () => {
  it("measures each tool and sorts the largest first", () => {
    const tools = ChatContextService.measureTools({
      small: {
        description: "Small",
        inputSchema: jsonSchema({ type: "object", properties: {} }),
      },
      large: {
        description: "Looks something up ".repeat(20),
        inputSchema: jsonSchema({ type: "object", properties: { id: { type: "string" } } }),
      },
    });
    expect(tools.map(tool => tool.name)).toEqual(["large", "small"]);
    expect(tools[0].tokens).toBeGreaterThan(tools[1].tokens + 50);
  });
});

describe("ChatContextService.buildUsage", () => {
  it("holds back the reply reserve and the compaction buffer using the turn budget", () => {
    const usage = ChatContextService.buildUsage({
      maxTokens: 10_000,
      systemPromptTokens: 1000,
      tools: [{ name: "lookup", tokens: 1000 }],
      summaryTokens: 100,
      userMessageTokens: 200,
      assistantMessageTokens: 300,
    });
    expect(usage.replyReserveTokens).toBe(1600);
    expect(usage.compactionBufferTokens).toBe(1280);
  });
});
