import { describe, expect, it } from "bun:test";
import { checkChatStyle } from "./chat-style-check";

const BAD_BREAKDOWN = `Clean FC at 98.47% (389.53 raw pp, worth 272.78 weighted), up 0.04% and +4.76pp on your play eight minutes earlier.

**What went well**
- Your swings are maxed: pre-swing 69.99 out of 70 and follow-through 30 out of 30, so angle costs you nothing.

**What held you back**
- Cut center, 13.25 out of 15, is almost the whole story.
- Down-left cuts (12.38 out of 15 over 26 hits) are your least centered direction.
- Bottom row, far-left column is your weakest spot at 12.09 out of 15 across 20 hits.
- Dense sections cost 210 points per 100 notes against 125 in the calmest parts.

**What to work on**
- Aim for the middle of the block on down-left cuts.`;

const GOOD_BREAKDOWN = `That's a clean full combo at 98.47%, worth 272.78pp toward your total and 4.76pp more than your previous play. Your swings are maxed out (70 out of 70 before the hit, 30 out of 30 after), so almost everything you lost came from how centered your cuts were. Aim for the middle of the block on down-left cuts, and treat the rest as polish.`;

describe("checkChatStyle", () => {
  it("accepts a tight analysis answer", () => {
    expect(checkChatStyle(GOOD_BREAKDOWN, { kind: "analysis" })).toEqual([]);
  });

  it("flags the problems in the original score breakdown", () => {
    const issues = checkChatStyle(BAD_BREAKDOWN, { kind: "analysis" });

    expect(issues).toContain("used unexplained scoring jargon (per 100 notes)");
    expect(issues).toContain("6 bullets, the limit is 3");
    expect(issues).toContain("3 bold terms, the limit is 1");
  });

  it("flags em dashes, emoji, headers and tables", () => {
    expect(checkChatStyle("Nice play — 98%.", { kind: "simple" })).toContain("used an em or en dash");
    expect(checkChatStyle("Nice play 🎉", { kind: "simple" })).toContain("used an emoji");
    expect(checkChatStyle("## Summary\nNice play.", { kind: "simple" })).toContain("used a markdown header");
    expect(checkChatStyle("| a | b |\n|---|---|\n| 1 | 2 |", { kind: "simple" })).toContain("used a table");
  });

  it("flags leaked tool field names", () => {
    const issues = checkChatStyle("Your weightedGain is 4.2pp.", { kind: "simple" });

    expect(issues).toContain("leaked tool field names: weightedGain");
  });

  it("flags filler openers and closing offers", () => {
    expect(checkChatStyle("Great question! You are rank 12.", { kind: "simple" })).toContain(
      "opened with filler or praise for the question"
    );
    expect(
      checkChatStyle("You are rank 12. Tell me a map and I can check it.", { kind: "simple" })
    ).toContain("ended with an offer of further help");
    expect(checkChatStyle("You are rank 12. Let me know if you want more.", { kind: "simple" })).toContain(
      "ended with an offer of further help"
    );
  });

  it("limits questions to one", () => {
    const issues = checkChatStyle("Which map? And which difficulty?", { kind: "chat" });

    expect(issues).toContain("asked 2 questions, the limit is 1");
  });

  it("enforces the word limit for the answer kind", () => {
    const long = Array.from({ length: 130 }, () => "word").join(" ");

    expect(checkChatStyle(long, { kind: "simple" })).toContain(
      "130 words for a simple answer, the limit is 120"
    );
    expect(checkChatStyle(long, { kind: "analysis" })).toEqual([]);
  });

  it("keeps declines and casual replies as plain prose", () => {
    const declined = "I can only help with Beat Saber.\n- scores\n- maps";

    expect(checkChatStyle(declined, { kind: "decline" })).toContain(
      "used bullets in a decline answer, which should be plain prose"
    );
    expect(checkChatStyle("Hey, what are you playing today?", { kind: "chat" })).toEqual([]);
  });

  it("flags exclamation marks and mannered phrases", () => {
    expect(checkChatStyle("Nice run!", { kind: "chat" })).toContain("used an exclamation mark");
    expect(checkChatStyle("Honestly, that is fine.", { kind: "chat" })).toContain(
      "used a mannered phrase or warning frame"
    );
    expect(checkChatStyle("One thing: it sits on another account.", { kind: "chat" })).toContain(
      "used a mannered phrase or warning frame"
    );
  });

  it("rejects an empty answer", () => {
    expect(checkChatStyle("   ", { kind: "simple" })).toEqual(["empty answer"]);
  });
});
