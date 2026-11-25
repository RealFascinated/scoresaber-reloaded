export type ChatAnswerKind = "simple" | "analysis" | "decline" | "chat";

export interface ChatStyleOptions {
  kind: ChatAnswerKind;
}

const WORD_LIMITS: Record<ChatAnswerKind, number> = {
  simple: 120,
  analysis: 170,
  decline: 60,
  chat: 80,
};

const TOOL_FIELD_NAMES = [
  "weightedGain",
  "predictedPp",
  "pointsLost",
  "takeaways",
  "leaderboardId",
  "playerId",
  "allPlayersAccuracy",
  "fullCombo",
];

const FILLER_OPENERS = [
  /^\s*(great|good|excellent|fantastic|interesting) (question|point|idea)/i,
  /^\s*(certainly|absolutely|sure thing|of course)[,!.]/i,
  /^\s*(i'd be happy to|i would be happy to|i'm happy to)/i,
  /^\s*as an ai\b/i,
];

const CLOSING_OFFERS = [
  /let me know if/i,
  /feel free to/i,
  /(want|would you like) me to/i,
  /hope (this|that) helps/i,
  /if you (have|need) (any )?(more|other|further|anything)/i,
  /happy to help (further|with)/i,
  /\bI can (also )?(break|show|check|help|dig|pull|look|walk)/i,
  /\band I('ll| will| can)\b/i,
];

const JARGON = [/\bper 100 notes\b/i];

const EMOJI = /\p{Extended_Pictographic}/u;
const HEADER_LINE = /^\s{0,3}#{1,6}\s/m;
const TABLE_ROW = /^\s*\|.*\|\s*$/m;
const BULLET_LINE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const BOLD_TERM = /\*\*[^*\n]+\*\*/g;
const MANNERED = [
  /\b(honestly|genuinely|to be clear)\b/i,
  /worth noting/i,
  /\bnot (just |only )?[^.,;]{1,40}, but\b/i,
  /^here('s| is) (a|the|your) breakdown/i,
  /^(one thing|note that|heads up|unfortunately)\b/i,
];
const MAX_BULLETS = 3;
const MAX_BOLD_TERMS = 1;
const MAX_QUESTIONS = 1;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function bulletCount(text: string) {
  return text.split("\n").filter(line => BULLET_LINE.test(line)).length;
}

/**
 * Deterministic voice and formatting checks for one assistant answer, returning one message per violation.
 */
export function checkChatStyle(answer: string, { kind }: ChatStyleOptions) {
  const issues: string[] = [];
  const text = answer.trim();
  if (text.length === 0) {
    return ["empty answer"];
  }

  if (text.includes("—") || text.includes("–")) {
    issues.push("used an em or en dash");
  }
  if (EMOJI.test(text)) {
    issues.push("used an emoji");
  }
  if (HEADER_LINE.test(text)) {
    issues.push("used a markdown header");
  }
  if (TABLE_ROW.test(text)) {
    issues.push("used a table");
  }

  const fields = TOOL_FIELD_NAMES.filter(name => text.includes(name));
  if (fields.length > 0) {
    issues.push(`leaked tool field names: ${fields.join(", ")}`);
  }
  if (JARGON.some(pattern => pattern.test(text))) {
    issues.push("used unexplained scoring jargon (per 100 notes)");
  }
  if (FILLER_OPENERS.some(pattern => pattern.test(text))) {
    issues.push("opened with filler or praise for the question");
  }
  if (CLOSING_OFFERS.some(pattern => pattern.test(text))) {
    issues.push("ended with an offer of further help");
  }

  const questions = (text.match(/\?/g) ?? []).length;
  if (questions > MAX_QUESTIONS) {
    issues.push(`asked ${questions} questions, the limit is ${MAX_QUESTIONS}`);
  }

  const words = wordCount(text);
  if (words > WORD_LIMITS[kind]) {
    issues.push(`${words} words for a ${kind} answer, the limit is ${WORD_LIMITS[kind]}`);
  }

  const bullets = bulletCount(text);
  if (bullets > MAX_BULLETS) {
    issues.push(`${bullets} bullets, the limit is ${MAX_BULLETS}`);
  }
  if ((kind === "decline" || kind === "chat" || kind === "simple") && bullets > 0) {
    issues.push(`used bullets in a ${kind} answer, which should be plain prose`);
  }
  const bold = (text.match(BOLD_TERM) ?? []).length;
  if (bold > MAX_BOLD_TERMS) {
    issues.push(`${bold} bold terms, the limit is ${MAX_BOLD_TERMS}`);
  }
  if (text.includes("!")) {
    issues.push("used an exclamation mark");
  }
  if (MANNERED.some(pattern => pattern.test(text))) {
    issues.push("used a mannered phrase or warning frame");
  }

  return issues;
}
