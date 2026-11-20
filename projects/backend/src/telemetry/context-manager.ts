import { ROOT_CONTEXT, type Context, type ContextManager } from "@opentelemetry/api";
import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<Context>();

/** Makes `ctx` the active context for the remainder of the current async execution. */
export function enterContext(ctx: Context) {
  storage.enterWith(ctx);
}

export class EnterableContextManager implements ContextManager {
  active() {
    return storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    ctx: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ) {
    return storage.run(ctx, fn.bind(thisArg as ThisParameterType<F>), ...args);
  }

  bind<T>(ctx: Context, target: T) {
    if (typeof target !== "function") {
      return target;
    }
    const fn = target as unknown as (...args: unknown[]) => unknown;
    const bound = (...args: unknown[]) => storage.run(ctx, () => fn(...args));
    return bound as unknown as T;
  }

  enable() {
    return this;
  }

  disable() {
    storage.disable();
    return this;
  }
}
