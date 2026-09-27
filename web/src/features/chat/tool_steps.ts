/**
 * The tools the journal reached for during one turn, one step per call.
 *
 * Calls in a turn run together, so their events arrive in whatever order they
 * finish: a step is matched by call id, never by position. Steps are live only
 * — a conversation reopened from the record has none.
 */

export type ToolStatus = "running" | "done" | "failed";

export interface ToolStep {
  id: string;
  name: string;
  status: ToolStatus;
}

export interface ToolFrame {
  /** The runtime's call id; empty when it did not send one. */
  id: string;
  name: string;
  done: boolean;
  failed: boolean;
}

export const NO_STEPS: ToolStep[] = [];

function statusOf(frame: ToolFrame): ToolStatus {
  if (!frame.done) {
    return "running";
  }

  return frame.failed ? "failed" : "done";
}

function stepFor(steps: ToolStep[], frame: ToolFrame): number {
  if (frame.id) {
    return steps.findIndex((step) => step.id === frame.id);
  }

  // Nothing to match on, so a result closes the oldest open call of its tool.
  return frame.done
    ? steps.findIndex((step) => step.name === frame.name && step.status === "running")
    : -1;
}

export function withToolFrame(steps: ToolStep[], frame: ToolFrame): ToolStep[] {
  const at = stepFor(steps, frame);
  const status = statusOf(frame);

  if (at === -1) {
    return [...steps, { id: frame.id || `step-${steps.length}`, name: frame.name, status }];
  }

  // A call reported after its own result must not reopen it.
  if (steps[at].status !== "running" || status === "running") {
    return steps;
  }

  return steps.map((step, index) => (index === at ? { ...step, status } : step));
}

/** A run that ended with calls still open: they are not coming back. */
export function closedSteps(steps: ToolStep[]): ToolStep[] {
  return steps.some((step) => step.status === "running")
    ? steps.map((step) => (step.status === "running" ? { ...step, status: "failed" } : step))
    : steps;
}
