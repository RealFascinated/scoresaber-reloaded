import type { StopCondition, ToolSet } from "ai";

type StepLike = {
  content: ReadonlyArray<{ type: string; invalid?: boolean }>;
};

/**
 * Whether a step only made tool calls that failed input validation, which cost no budget so the model can fix them.
 */
export function isFreeRetryStep(step: StepLike) {
  const calls = step.content.filter(part => part.type === "tool-call");
  return calls.length > 0 && calls.every(call => call.invalid === true);
}

/**
 * Stops after maxSteps steps, not counting steps whose tool calls all failed input validation. Those
 * retries are capped at maxSteps as well, so a looping model still stops at twice the budget.
 */
export function chatStepLimit(maxSteps: number) {
  const condition: StopCondition<ToolSet> = ({ steps }) => {
    const free = steps.filter(isFreeRetryStep).length;
    const counted = steps.length - free;
    return counted >= maxSteps || free >= maxSteps;
  };
  return condition;
}
