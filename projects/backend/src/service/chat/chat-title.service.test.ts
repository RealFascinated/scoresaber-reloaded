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

describe("ChatTitleService.cleanTitleInput", () => {
  it("strips player ids, embed directives and markdown", () => {
    expect(ChatTitleService.cleanTitleInput("Summarize Bob's play style (player 76561198866778629)")).toBe(
      "Summarize Bob's play style"
    );
    expect(
      ChatTitleService.cleanTitleInput("::player{id=7656119901849}\n\n**Bob** is a grinder\\nsecond line")
    ).toBe("Bob is a grinder second line");
    expect(ChatTitleService.cleanTitleInput("Clean FC :map[Eviternity]{id=632465} at 95%")).toBe(
      "Clean FC at 95%"
    );
  });
});
