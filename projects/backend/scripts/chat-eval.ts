import { env } from "@ssr/common/env";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { writeFile } from "node:fs/promises";
import { ChatModelService } from "../src/service/chat/chat-model.service";
import { checkChatStyle, type ChatAnswerKind } from "../src/service/chat/chat-style-check";
import { buildChatSystemPrompt } from "../src/service/chat/chat-system-prompt";
import { createChatTools } from "../src/service/chat/tools/chat-tools";

interface EvalPlayer {
  id: string;
  name: string;
}

interface EvalCase {
  id: string;
  turns: string[];
  kind: ChatAnswerKind;
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
  metrics: TurnMetrics;
  user: string;
  answer: string;
  tools: ToolTrace[];
}

interface Verdict {
  pass: boolean;
  issues: string[];
}

interface TurnMetrics {
  steps: number;
  toolCalls: number;
  toolErrors: number;
  invalidCalls: number;
}

interface CaseResult {
  caseId: string;
  metrics?: TurnMetrics;
  player: EvalPlayer;
  turns: TurnResult[];
  checks: string[];
  verdict: Verdict;
  voice: Verdict;
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
    kind: "analysis",
    turns: ["what could I improve on?", "well I gain pp on low stars though?"],
    expectTools: ["getPlayerPerformance", "getSuggestedMaps"],
    forbid: INVENTED_REASONING,
    rubric:
      "Advice must follow the tool data. Map recommendations must be compared by weightedGain, not predictedPp. Claims about strengths or weaknesses must match getPlayerPerformance buckets. On the pushback, the assistant must recheck and either concede with corrected numbers or hold its position with a number; it must not flip-flop without data.",
  },
  {
    id: "what-if-pp",
    kind: "simple",
    turns: ["how much pp would I gain from a 98% on a 6 star map?"],
    expectTools: ["calculatePp"],
    rubric:
      "Raw pp and weighted gain must equal the calculatePp result (rounding ok). The answer must distinguish raw pp from the weighted gain to total pp.",
  },
  {
    id: "average-accuracy",
    kind: "analysis",
    turns: ["why is my average ranked accuracy so low?"],
    forbid: INVENTED_REASONING,
    rubric:
      "Must not invent a cause. Should explain that average ranked accuracy averages every ranked score so it reflects map choice, and if it gives reasons they must come from getPlayerPerformance data (for example accuracy by star bucket).",
  },
  {
    id: "strongest-range",
    kind: "analysis",
    turns: ["which star range am I strongest at?"],
    expectTools: ["getPlayerPerformance"],
    rubric:
      "Must base the answer on getPlayerPerformance buckets, must not treat lower accuracy at higher stars as a weakness by itself, and should consider pp or top 50 presence, not only raw accuracy.",
  },
  {
    id: "score-quality",
    kind: "simple",
    turns: ["is 96% on a 9 star map good for me?"],
    expectTools: ["getPlayerPerformance"],
    rubric:
      "Must compare 96% against the player's own accuracy near 9 stars from getPlayerPerformance (or say they have no data there). Hypothetical pp numbers (what a 96% would give) must come from calculatePp; pp fields quoted from getPlayerPerformance are fine.",
  },
  {
    id: "weekly-progress",
    kind: "simple",
    turns: ["how much pp have I gained this week?"],
    expectTools: ["getPlayerHistory"],
    rubric:
      "The pp change must equal the difference in the history rows; days covered must be stated correctly.",
  },
  {
    id: "next-maps",
    kind: "analysis",
    turns: ["give me 3 maps to play for pp"],
    expectTools: ["getSuggestedMaps"],
    rubric:
      "Must pick maps in the order getSuggestedMaps returned (or justify by weightedGain), show them with ::map cards using returned ids, and quote weightedGain rather than predictedPp as the gain.",
  },
  {
    id: "hundred-percent",
    kind: "simple",
    turns: ["how do I get a 100% on a 6 star map?"],
    rubric:
      "Must say that 100% is essentially unattainable on a ranked map of that difficulty and that anything above 99% is elite, and must not present 100% as a normal goal. Should give a realistic accuracy target from tool data or the player's own results instead.",
  },
  {
    id: "realistic-target",
    kind: "analysis",
    turns: ["what accuracy should I aim for on 9 star maps to gain pp?"],
    expectTools: ["getPlayerPerformance"],
    rubric:
      "Must base the target on the player's own accuracy at about 9 stars (getPlayerPerformance) and state how rare higher accuracies are. Must not suggest 99% or more on 9 star maps as a target.",
  },
  {
    id: "off-topic",
    kind: "decline",
    turns: ["write me a python script that sorts a list"],
    rubric: "Must refuse in one short sentence and not provide any code.",
  },
  {
    id: "voice-greeting",
    kind: "chat",
    turns: ["hey"],
    rubric:
      "A casual greeting. Must reply in one or two friendly sentences, without calling tools, without a feature list, and without bullets.",
  },
  {
    id: "voice-thanks",
    kind: "chat",
    turns: ["what is my global rank?", "thanks, that's helpful"],
    expectTools: ["getPlayer"],
    rubric:
      "The second turn is only thanks. Must reply with a short natural acknowledgement (one sentence), no recap, no new analysis, no offer of further help.",
  },
  {
    id: "voice-simple-rank",
    kind: "simple",
    turns: ["what's my rank?"],
    expectTools: ["getPlayer"],
    rubric:
      "Must answer with the player's global rank (and country rank if returned) in one or two plain sentences, with no headers or bullets.",
  },
  {
    id: "voice-breakdown-latest",
    kind: "analysis",
    turns: ["break down my latest score"],
    rubric:
      "Must open with a one sentence verdict, be short prose (at most two short paragraphs, no bold labels), explain every number in game terms, and give a concrete next step per weakness. It must lead with what went wrong and how to fix it, cite replay numbers for the cause and the gain in accuracy or pp, and must not list perfect stats, call the target easy, hard, elite or polish, or wish luck.",
  },
  {
    id: "voice-rude",
    kind: "chat",
    turns: ["this assistant is useless, you got my rank wrong"],
    rubric:
      "The user is annoyed. Must not grovel or over-apologize, must not get defensive, and should stay on the problem: offer to recheck by actually checking (calling a tool is fine) and then give the number. Plain prose.",
  },
  {
    id: "voice-no-bullets",
    kind: "analysis",
    turns: ["what should I work on? please no bullet points or bold, just talk to me"],
    rubric:
      "The user asked for no bullets or bold formatting. Must answer in plain flowing prose with no lists, no bold and no headers, while still giving data-backed advice.",
  },
  {
    id: "voice-decline-tone",
    kind: "decline",
    turns: ["can you help me write my history homework about Rome?"],
    rubric:
      "Must decline warmly in one or two plain sentences with no lists, no lecture, and point back to what it can help with (Beat Saber scores, players, maps).",
  },
  {
    id: "voice-ambiguous",
    kind: "chat",
    turns: ["is it any good?"],
    rubric:
      "The request has no clear subject. Must ask exactly one short clarifying question (what to look at, such as a map, score or player) without guessing, listing options, or calling unrelated tools.",
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
const VOICE_SYSTEM = `You grade the voice of a Beat Saber assistant that should talk like Claude: a knowledgeable, warm, direct coach. Judge only tone and writing, never data accuracy.

Pass only if all of these hold:
- It sounds like a person talking, in natural prose, matching the register of the message (casual gets casual and short, analysis gets structure).
- It answers first. No praise of the question, no filler opener, no restating the question, no closing recap, no offer of further help.
- It is warm without being gushing, and honest without being cold. Pushback is constructive. It owns mistakes briefly without groveling and does not get defensive.
- It never reads like a manual or a data dump: numbers are explained in game terms and only included when they support a point.
- It asks at most one question, and only when it truly needs the answer.
- It honors explicit formatting requests from the user.
- Declines are brief, kind and in plain prose, never a list.

Also apply the case rubric for tone. Reply with only JSON: {"pass": boolean, "issues": string[]}.`;
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
      reasoning: env.CHAT_REASONING_EFFORT,
    });
    messages.push(...result.response.messages);
    const traces = result.steps.flatMap(step =>
      step.toolResults.map(toolResult => ({
        name: toolResult.toolName,
        input: JSON.stringify(toolResult.input),
        output: truncate(JSON.stringify(toolResult.output)),
      }))
    );
    const parts = result.steps.flatMap(step => step.content);
    const metrics = {
      steps: result.steps.length,
      toolCalls: parts.filter(part => part.type === "tool-call").length,
      toolErrors: parts.filter(part => part.type === "tool-error").length,
      invalidCalls: parts.filter(part => part.type === "tool-call" && part.invalid === true).length,
    } satisfies TurnMetrics;
    turns.push({ user, answer: result.text, tools: traces, metrics });
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
    for (const issue of groundingIssues(turn)) {
      checks.push(issue);
    }
    for (const issue of checkChatStyle(turn.answer, {
      kind: turn === turns[0] || evalCase.kind !== "chat" ? evalCase.kind : "chat",
    })) {
      checks.push(`style: ${issue}`);
    }
  }

  const [verdict, voice] = await Promise.all([judge(evalCase, turns), judgeVoice(evalCase, turns)]);
  return {
    caseId: evalCase.id,
    player,
    turns,
    checks,
    verdict,
    voice,
    ms: Date.now() - started,
    metrics: sumMetrics(turns.map(turn => turn.metrics)),
  } satisfies CaseResult;
}

function sumMetrics(all: TurnMetrics[]) {
  return all.reduce(
    (sum, item) => ({
      steps: sum.steps + item.steps,
      toolCalls: sum.toolCalls + item.toolCalls,
      toolErrors: sum.toolErrors + item.toolErrors,
      invalidCalls: sum.invalidCalls + item.invalidCalls,
    }),
    { steps: 0, toolCalls: 0, toolErrors: 0, invalidCalls: 0 } satisfies TurnMetrics
  );
}

const TOLERANCE = 0.011;
const NUMBER_PATTERN = /\d+(?:\.\d+)?/g;

function numbersIn(text: string) {
  return (text.match(NUMBER_PATTERN) ?? []).map(Number);
}

/**
 * Numbers with a decimal point or a percent sign in the answer must appear in a tool output, the user's
 * question, or the fixed scoring facts, and no accuracy of 99.5% or more may be offered unless a tool returned it.
 */
function groundingIssues(turn: TurnResult) {
  const known = [
    ...turn.tools.flatMap(trace => numbersIn(trace.output)),
    ...numbersIn(turn.user),
    ...numbersIn(SCORING_KNOWLEDGE),
  ];
  const issues: string[] = [];
  const answer = turn.answer.replace(/(?<=\d),(?=\d{3})/g, "");
  const claimed = answer.match(/\d+(?:\.\d+)?\s?%|\d+\.\d+/g) ?? [];
  const ungrounded = new Set<string>();
  for (const raw of claimed) {
    const value = Number(raw.replace(/[^0-9.]/g, ""));
    if (!known.some(candidate => Math.abs(candidate - value) <= TOLERANCE)) {
      ungrounded.add(raw.trim());
    }
  }
  if (ungrounded.size > 0) {
    issues.push(`ungrounded numbers: ${[...ungrounded].slice(0, 6).join(", ")}`);
  }
  for (const raw of answer.match(/\d+(?:\.\d+)?\s?%/g) ?? []) {
    if (
      Number(raw.replace(/[^0-9.]/g, "")) >= 99.5 &&
      !/impossible|unrealistic|virtually|essentially|almost never|no one/i.test(answer)
    ) {
      issues.push(`offered an accuracy of ${raw.trim()} without calling it unrealistic`);
    }
  }
  return issues;
}

function renderTranscript(turns: TurnResult[]) {
  return turns
    .map(
      turn =>
        `USER: ${turn.user}\nTOOL CALLS:\n${turn.tools.map(trace => `- ${trace.name}(${trace.input}) => ${trace.output}`).join("\n") || "(none)"}\nASSISTANT: ${turn.answer}`
    )
    .join("\n\n");
}

async function judge(evalCase: EvalCase, turns: TurnResult[]) {
  return runJudge(JUDGE_SYSTEM, evalCase, turns);
}

async function judgeVoice(evalCase: EvalCase, turns: TurnResult[]) {
  return runJudge(VOICE_SYSTEM, evalCase, turns);
}

async function runJudge(system: string, evalCase: EvalCase, turns: TurnResult[]) {
  const transcript = renderTranscript(turns);
  for (let attempt = 0; attempt < JUDGE_ATTEMPTS; attempt++) {
    const result = await generateText({
      model: ChatModelService.getTitleModel(),
      maxOutputTokens: 8192,
      system,
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
  const passed = results.filter(
    result => result.verdict.pass && result.voice.pass && result.checks.length === 0
  ).length;
  lines.push(
    `${passed}/${results.length} passed`,
    "",
    "| case | player | judge | voice | checks | s | steps | calls | errors |",
    "|---|---|---|---|---|---|---|---|---|"
  );
  for (const result of results) {
    lines.push(
      `| ${result.caseId} | ${result.player.name} | ${result.verdict.pass ? "pass" : "FAIL"} | ${result.voice.pass ? "pass" : "FAIL"} | ${result.checks.join("; ") || "ok"} | ${(result.ms / 1000).toFixed(0)} | ${result.metrics?.steps ?? "-"} | ${result.metrics?.toolCalls ?? "-"} | ${result.metrics?.toolErrors ?? "-"} |`
    );
  }
  for (const result of results) {
    lines.push("", `## ${result.caseId} / ${result.player.name}`, "");
    if (!result.verdict.pass) {
      lines.push(...result.verdict.issues.map(issue => `- judge: ${issue}`));
    }
    if (!result.voice.pass) {
      lines.push(...result.voice.issues.map(issue => `- voice: ${issue}`));
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
      const [verdict, voice] = await Promise.all([
        judge(evalCase, result.turns),
        judgeVoice(evalCase, result.turns),
      ]);
      return { ...result, verdict, voice } satisfies CaseResult;
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
  (evalCase.id === "off-topic" || evalCase.id.startsWith("voice-") ? PLAYERS.slice(0, 1) : PLAYERS).map(
    player => () =>
      runCase(evalCase, player).catch(
        error =>
          ({
            caseId: evalCase.id,
            player,
            turns: [],
            checks: [`crashed: ${error instanceof Error ? error.message : String(error)}`],
            verdict: { pass: false, issues: [] },
            voice: { pass: false, issues: [] },
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
