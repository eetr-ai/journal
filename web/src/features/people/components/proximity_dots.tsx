import { isProximityLevel, PROXIMITY_LEVELS } from "../rules";
import type { Dictionary } from "@/i18n/en";

export interface ProximityDotsOptions {
  value: string;
  t: Dictionary;
}

// One dot a level, filled up to how close they are.
const DOTS = PROXIMITY_LEVELS.map(Number).toSorted((a, b) => a - b);

/** How close someone is, as a quiet row of dots. Nothing when it is not known. */
export default function ProximityDots(options: ProximityDotsOptions) {
  if (!isProximityLevel(options.value)) {
    return null;
  }

  const level = Number(options.value);
  const label = options.t.people.proximityLevels[options.value];

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" title={label}>
      <span className="sr-only">{label}</span>
      {DOTS.map((dot) => (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${dot <= level ? "bg-brand/70" : "bg-border"}`}
          key={dot}
        />
      ))}
    </span>
  );
}
