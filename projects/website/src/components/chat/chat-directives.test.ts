import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkDirective from "remark-directive";
import { parseEntityId, remarkChatDirectives, stripIncompleteDirective } from "./chat-directives";

function render(markdown: string) {
  return renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkDirective, remarkChatDirectives] }, markdown)
  );
}

describe("stripIncompleteDirective", () => {
  test("strips partial directives at the end", () => {
    expect(stripIncompleteDirective("Here:\n\n::map{id=12")).toBe("Here:\n\n");
    expect(stripIncompleteDirective("see ::")).toBe("see ");
    expect(stripIncompleteDirective("see :")).toBe("see ");
    expect(stripIncompleteDirective("see :map[Lab")).toBe("see ");
    expect(stripIncompleteDirective("see :player[Lab]{id=1")).toBe("see ");
    expect(stripIncompleteDirective("::pla")).toBe("");
  });

  test("keeps complete directives and ordinary colons", () => {
    expect(stripIncompleteDirective("::map{id=12}")).toBe("::map{id=12}");
    expect(stripIncompleteDirective("Note:")).toBe("Note:");
    expect(stripIncompleteDirective("at 10:")).toBe("at 10:");
    expect(stripIncompleteDirective("see :foo")).toBe("see :foo");
    expect(stripIncompleteDirective("https://example.com")).toBe("https://example.com");
  });
});

describe("parseEntityId", () => {
  test("accepts quoted and unquoted digits only", () => {
    expect(parseEntityId("123")).toBe("123");
    expect(parseEntityId('"123"')).toBe("123");
    expect(parseEntityId("abc")).toBeUndefined();
    expect(parseEntityId(undefined)).toBeUndefined();
  });
});

describe("remarkChatDirectives", () => {
  test("leaves ordinary colons and unknown directives as typed", () => {
    expect(render("Note: this at 10:30 and :foo and a:b")).toBe(
      "<p>Note: this at 10:30 and :foo and a:b</p>"
    );
    expect(render("::foo{id=1}")).toBe("<p>::foo{id=1}</p>");
    expect(render(":map[Bad]{id=abc}")).toBe("<p>:map[Bad]{id=abc}</p>");
  });

  test("groups consecutive leaf directives and marks inline ones", () => {
    const html = render('::map{id=1}\n::player{id="2"}\n\nSee :map[Song]{id=3} ok');
    expect(html).toContain("<chat-entity-list>");
    expect(html.match(/<chat-entity /g)?.length).toBe(3);
    expect(html).toContain("Song");
    expect(html).toContain("<p>See ");
  });
});
