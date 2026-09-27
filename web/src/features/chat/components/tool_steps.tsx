"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { toolDisplay } from "../tool_display";
import type { ToolStatus, ToolStep } from "../tool_steps";
import type { Dictionary } from "@/i18n/en";

const ICON_SIZE = 14;
const MARK_SIZE = 11;

export interface ToolStepsOptions {
  t: Dictionary;
  steps: ToolStep[];
}

/** What the journal did on the way to its answer, one line a call. */
export default function ToolSteps(options: ToolStepsOptions) {
  if (options.steps.length === 0) {
    return null;
  }

  return (
    <ul aria-live="polite" className="mb-2 flex flex-col gap-1 text-xs text-muted">
      {options.steps.map((step) => (
        <Step key={step.id} step={step} t={options.t} />
      ))}
    </ul>
  );
}

interface StepOptions {
  t: Dictionary;
  step: ToolStep;
}

function Step(options: StepOptions) {
  const display = toolDisplay(options.step.name, options.t.chat.tools);
  const Icon = display.icon;
  const running = options.step.status === "running";

  return (
    <li className="flex items-center gap-1.5 motion-safe:animate-rise-in">
      <span aria-hidden className={running ? "text-brand motion-safe:animate-pulse" : ""}>
        <Icon size={ICON_SIZE} weight="duotone" />
      </span>
      <span className={running ? "shimmer-text" : ""}>{display[options.step.status]}</span>
      <Mark status={options.step.status} />
    </li>
  );
}

// The words already say how it went; the mark is for the eye skimming past.
function Mark(options: { status: ToolStatus }) {
  if (options.status === "done") {
    return <CheckIcon aria-hidden className="text-brand" size={MARK_SIZE} weight="bold" />;
  }

  if (options.status === "failed") {
    return <XIcon aria-hidden className="text-accent" size={MARK_SIZE} weight="bold" />;
  }

  return null;
}
