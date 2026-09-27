export interface TypingDotsOptions {
  /** Read out in place of the dots. */
  label: string;
}

// Staggered by class rather than style so the delays sit with the rest of the
// motion, and all three stop together under reduced motion.
const DOTS = ["[animation-delay:0ms]", "[animation-delay:150ms]", "[animation-delay:300ms]"];

/** The journal has the message and has not said anything yet. */
export default function TypingDots(options: TypingDotsOptions) {
  return (
    <output aria-label={options.label} className="flex h-5 items-center gap-1 text-muted">
      {DOTS.map((delay) => (
        <span
          aria-hidden
          className={`size-1.5 rounded-full bg-current motion-safe:animate-typing-dot ${delay}`}
          key={delay}
        />
      ))}
    </output>
  );
}
