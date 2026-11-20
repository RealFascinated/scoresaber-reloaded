import { describe, expect, it } from "bun:test";
import { chatStepLimit } from "./chat-step-limit";

const okStep = { content: [{ type: "tool-call" }, { type: "tool-result" }] };
const invalidStep = { content: [{ type: "tool-call", invalid: true }, { type: "tool-error" }] };

describe("chatStepLimit", () => {
  it("stops once the counted steps reach the limit", () => {
    const stop = chatStepLimit(3);

    expect(stop({ steps: [okStep, okStep] as never })).toBe(false);
    expect(stop({ steps: [okStep, okStep, okStep] as never })).toBe(true);
  });

  it("does not count steps that only failed input validation", () => {
    const stop = chatStepLimit(3);

    expect(stop({ steps: [okStep, okStep, invalidStep, invalidStep] as never })).toBe(false);
  });

  it("still stops a model that keeps sending invalid input", () => {
    const stop = chatStepLimit(2);

    expect(stop({ steps: [invalidStep, invalidStep] as never })).toBe(true);
  });
});
