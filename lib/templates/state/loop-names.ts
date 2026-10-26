/**
 * The names a ForEach gives its item and position (cell, i, and an outer
 * loop's too), for the calculations an event's actions run inside that
 * loop. The docs call them {i} and {cell}, but in expression="…" only
 * $vars.i found them: a bare i was empty, so slice(0, i) kept the whole
 * list and a tic-tac-toe click doubled the board. ActionExecutor sets them
 * while it runs a loop's actions; evaluateExpression reads them, under
 * whatever the caller itself put in the context.
 */
let active: Record<string, unknown> | null = null;

export function withLoopNames<T>(names: Record<string, unknown> | null, run: () => T): T {
  const before = active;
  active = names;
  try {
    return run();
  } finally {
    active = before;
  }
}

export function loopNames(): Record<string, unknown> | null {
  return active;
}
