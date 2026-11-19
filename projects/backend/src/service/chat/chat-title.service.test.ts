import { describe, expect, it } from "bun:test";
import { ChatTitleService } from "./chat-title.service";

describe("ChatTitleService.cleanTitle", () => {
  it("strips quotes, trailing punctuation and extra lines", () => {
    expect(ChatTitleService.cleanTitle('"My ranked progress."\nmore', "fallback")).toBe("My ranked progress");
  });

  it("falls back to the first user message when the title is empty", () => {
    expect(ChatTitleService.cleanTitle('  ""  ', "What is my rank?")).toBe("What is my rank?");
  });

  it("truncates long fallbacks to 60 characters", () => {
    const title = ChatTitleService.fallbackTitle("a".repeat(200));
    expect(title.length).toBe(60);
    expect(title.endsWith("…")).toBe(true);
  });
});
