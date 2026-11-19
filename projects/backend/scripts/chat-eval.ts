import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { writeFile } from "node:fs/promises";
import { ChatModelService } from "../src/service/chat/chat-model.service";
import { buildChatSystemPrompt } from "../src/service/chat/chat-system-prompt";
import { createChatTools } from "../src/service/chat/tools/chat-tools";

interface EvalPlayer {
  id: string;
  name: string;
}

interface EvalCase {
  id: string;
  turns: string[];
  expectTools?: string[];
  forbid?: RegExp[];
  rubric: string;
}

interface ToolTrace {
  name: string;
  input: string;
  output: string;
}

interface TurnResult {
  user: string;
  answer: string;
  tools: ToolTrace[];
}

interface Verdict {
  pass: boolean;
  issues: string[];
}

interface CaseResult {
  caseId: string;
  player: EvalPlayer;
  turns: TurnResult[];
  checks: string[];
  verdict: Verdict;
  ms: number;
}

const PLAYERS: EvalPlayer[] = [
  { id: "76561198110018904", name: "Whiisper" },
  { id: "76561198296328455", name: "Contradictions" },
  { id: "76561199511275376", name: "Mr Onion" },
];

const INVENTED_REASONING = [/ceiling/i, /tapped out/i, /map (that )?size/i, /dragged down/i];

const CASES: EvalCase[] = [
  {
    id: "improve-pushback",
    turns: ["what could I improve on?", "well I gain pp on low stars though?"],
    expectTools: ["getPlayerPerformance", "getSuggestedMaps"],
    forbid: INVENTED_REASONING,
    rubric:
      "Advice must follow the tool data. Map recommendations must be compared by weightedGain, not predictedPp. Claims about strengths or weaknesses must match getPlayerPerformance buckets. On the pushback, the assistant must recheck and either concede with corrected numbers or hold its position with a number; it must not flip-flop without data.",
  },
  {
    id: "what-if-pp",
    turns: ["how much pp would I gain from a 98% on a 6 star map?"],
    expectTools: ["calculatePp"],
    rubric:
      "Raw pp and weighted gain must equal the calculatePp result (rounding ok). The answer must distinguish raw pp from the weighted gain to total pp.",
  },
  {
    id: "average-accuracy",
    turns: ["why is my average ranked accuracy so low?"],
    forbid: INVENTED_REASONING,
    rubric:
      "Must not invent a cause. Should explain that average ranked accuracy averages every ranked score so it reflects map choice, and if it gives reasons they must come from getPlayerPerformance data (for example accuracy by star bucket).",
  },
  {
    id: "strongest-range",
    turns: ["which star range am I strongest at?"],
    expectTools: ["getPlayerPerformance"],
    rubric:
      "Must base the answer on getPlayerPerformance buckets, must not treat lower accuracy at higher stars as a weakness by itself, and should consider pp or top 50 presence, not only raw accuracy.",
  },
  {
    id: "score-quality",
    turns: ["is 96% on a 9 star map good for me?"],
    expectTools: ["getPlayerPerformance"],
    rubric:
      "Must compare 96% against the player's own accuracy near 9 stars from getPlayerPerformance (or say they have no data there). Hypothetical pp numbers (what a 96% would give) must come from calculatePp; pp fields quoted from getPlayerPerformance are fine.",
  },
  {
    id: "weekly-progress",
    turns: ["how much pp have I gained this week?"],
    expectTools: ["getPlayerHistory"],
    rubric:
      "The pp change must equal the difference in the history rows; days covered must be stated correctly.",
  },
  {
    id: "next-maps",
    turns: ["give me 3 maps to play for pp"],
    expectTools: ["getSuggestedMaps"],
    rubric:
      "Must pick maps in the order getSuggestedMaps returned (or justify by weightedGain), show them with ::map cards using returned ids, and quote weightedGain rather than predictedPp as the gain.",
  },
  {
    id: "off-topic",
    turns: ["write me a python script that sorts a list"],
    rubric: "Must refuse in one short sentence and not provide any code.",
  },
];

const CONCURRENCY = 4;
const PROMPT_FOR_KNOWLEDGE = buildChatSystemPrompt({
  userName: "judge",
  playerId: null,
  realmId: DEFAULT_REALM_ID,
  now: new Date(),
});
const SCORING_KNOWLEDGE = PROMPT_FOR_KNOWLEDGE.slice(
  PROMPT_FOR_KNOWLEDGE.indexOf("## How ScoreSaber scoring works"),
  PROMPT_FOR_KNOWLEDGE.indexOf("## Showing maps and players")
);
const JUDGE_SYSTEM = `You grade answers from a Beat Saber ScoreSaber assistant. The tool outputs are ground truth, and the following game facts and rules (which the assistant was also given) are true and may be stated without a tool result:\n\n${SCORING_KNOWLEDGE}\nFail the answer for any number that disagrees with the tool output, any claim about the player not supported by the tool output or the facts above, comparing options by raw pp instead of weightedGain, or breaking the case rubric. Do not fail for style, wording, or harmless omissions. Reply with only JSON: {"pass": boolean, "issues": string[]}.`;
const JUDGE_ATTEMPTS = 3;
const OUTPUT_LIMIT = 6000;

function truncate(text: string, limit: number = OUTPUT_LIMIT) {
  return text.length > limit ? `${text.slice(0, limit)}... [truncated]` : text;
}

async function runCase(evalCase: EvalCase, player: EvalPlayer) {
  const started = Date.now();
  const context = {
    userId: "chat-eval",
    userName: player.name,
    playerId: player.id,
    realmId: DEFAULT_REALM_ID,
  };
  const tools = createChatTools(context);
  const system = buildChatSystemPrompt({ ...context, now: new Date() });
  const messages: ModelMessage[] = [];
  const turns: TurnResult[] = [];

  for (const user of evalCase.turns) {
    messages.push({ role: "user", content: user });
    const result = await generateText({
      model: ChatModelService.getChatModel(),
      system,
      messages,
      tools,
      stopWhen: stepCountIs(8),
      maxOutputTokens: 2048,
    });
    messages.push(...result.response.messages);
    const traces = result.steps.flatMap(step =>
      step.toolResults.map(toolResult => ({
        name: toolResult.toolName,
        input: JSON.stringify(toolResult.input),
        output: truncate(JSON.stringify(toolResult.output)),
      }))
    );
    turns.push({ user, answer: result.text, tools: traces });
  }

  const checks: string[] = [];
  const calledTools = new Set(turns.flatMap(turn => turn.tools.map(trace => trace.name)));
  for (const expected of evalCase.expectTools ?? []) {
    if (!calledTools.has(expected)) {
      checks.push(`did not call ${expected}`);
    }
  }
  for (const turn of turns) {
    for (const pattern of evalCase.forbid ?? []) {
      if (pattern.test(turn.answer)) {
        checks.push(`answer matched forbidden ${pattern}`);
      }
    }
    if (turn.answer.includes("—")) {
      checks.push("answer used an em dash");
    }
    if (turn.answer.trim().length === 0) {
      checks.push("empty answer");
    }
  }

  const verdict = await judge(evalCase, turns);
  return {
    caseId: evalCase.id,
    player,
    turns,
    checks,
    verdict,
    ms: Date.now() - started,
  } satisfies CaseResult;
}

async function judge(evalCase: EvalCase, turns: TurnResult[]) {
  const transcript = turns
    .map(
      turn =>
        `USER: ${turn.user}\nTOOL CALLS:\n${turn.tools.map(trace => `- ${trace.name}(${trace.input}) => ${trace.output}`).join("\n") || "(none)"}\nASSISTANT: ${turn.answer}`
    )
    .join("\n\n");
  for (let attempt = 0; attempt < JUDGE_ATTEMPTS; attempt++) {
    const result = await generateText({
      model: ChatModelService.getChatModel(),
      maxOutputTokens: 8192,
      system: JUDGE_SYSTEM,
      prompt: `CASE RUBRIC: ${evalCase.rubric}\n\nTRANSCRIPT:\n${transcript}`,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed: Verdict = JSON.parse(match[0]);
      return parsed;
    }
  }
  return { pass: false, issues: ["judge returned no JSON"] } satisfies Verdict;
}

async function runPool<T>(jobs: (() => Promise<T>)[], limit: number) {
  const results: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < jobs.length) {
        const index = next++;
        results[index] = await jobs[index]();
      }
    })
  );
  return results;
}

function render(results: CaseResult[]) {
  const lines = [`# Chat eval ${new Date().toISOString()}`, ""];
  const passed = results.filter(result => result.verdict.pass && result.checks.length === 0).length;
  lines.push(
    `${passed}/${results.length} passed`,
    "",
    "| case | player | judge | checks | s |",
    "|---|---|---|---|---|"
  );
  for (const result of results) {
    lines.push(
      `| ${result.caseId} | ${result.player.name} | ${result.verdict.pass ? "pass" : "FAIL"} | ${result.checks.join("; ") || "ok"} | ${(result.ms / 1000).toFixed(0)} |`
    );
  }
  for (const result of results) {
    lines.push("", `## ${result.caseId} / ${result.player.name}`, "");
    if (!result.verdict.pass) {
      lines.push(...result.verdict.issues.map(issue => `- judge: ${issue}`));
    }
    lines.push(...result.checks.map(check => `- check: ${check}`));
    for (const turn of result.turns) {
      lines.push(
        "",
        `**User:** ${turn.user}`,
        "",
        `Tools: ${turn.tools.map(trace => `${trace.name}(${trace.input})`).join(", ") || "none"}`,
        "",
        turn.answer
      );
    }
  }
  return lines.join("\n");
}

const only = process.argv[2];
if (only?.endsWith(".json")) {
  const saved: CaseResult[] = JSON.parse(await Bun.file(only).text());
  const regraded = await runPool(
    saved.map(result => async () => {
      const evalCase = CASES.find(candidate => candidate.id === result.caseId);
      if (!evalCase || result.turns.length === 0) {
        return result;
      }
      return { ...result, verdict: await judge(evalCase, result.turns) } satisfies CaseResult;
    }),
    CONCURRENCY
  );
  const regradedPath = only.replace(/\.json$/, "-regraded.md");
  await writeFile(regradedPath, render(regraded));
  await writeFile(regradedPath.replace(/\.md$/, ".json"), JSON.stringify(regraded, null, 2));
  console.log(render(regraded).split("\n## ")[0]);
  console.log(`\nReport: ${regradedPath}`);
  process.exit(0);
}
const jobs = CASES.filter(evalCase => !only || evalCase.id === only).flatMap(evalCase =>
  (evalCase.id === "off-topic" ? PLAYERS.slice(0, 1) : PLAYERS).map(
    player => () =>
      runCase(evalCase, player).catch(
        error =>
          ({
            caseId: evalCase.id,
            player,
            turns: [],
            checks: [`crashed: ${error instanceof Error ? error.message : String(error)}`],
            verdict: { pass: false, issues: [] },
            ms: 0,
          }) satisfies CaseResult
      )
  )
);
const results = await runPool(jobs, CONCURRENCY);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `/tmp/chat-eval-${stamp}.md`;
await writeFile(path, render(results));
await writeFile(path.replace(/\.md$/, ".json"), JSON.stringify(results, null, 2));
console.log(render(results).split("\n## ")[0]);
console.log(`\nReport: ${path}`);
process.exit(0);
