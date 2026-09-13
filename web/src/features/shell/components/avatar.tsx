"use client";

import Image from "next/image";
import { useState } from "react";

const MAX_INITIALS = 2;

export interface AvatarOptions {
  name: string;
  /** Whether the session carries a photo at all. */
  hasImage: boolean;
  size: number;
}

/**
 * The person's photo, or their initials when there is none and when the photo
 * fails to load. The source is always our own /api/avatar, so nothing here has
 * to know which host the issuer serves pictures from.
 */
export default function Avatar(options: AvatarOptions) {
  const [broken, setBroken] = useState(false);

  // The size is set inline as well as by attribute: the preflight's
  // `img { height: auto }` beats the height attribute, and a non-square photo
  // then renders as an oval.
  if (options.hasImage && !broken) {
    return (
      <Image
        alt=""
        className="shrink-0 rounded-full object-cover"
        height={options.size}
        onError={() => setBroken(true)}
        src="/api/avatar"
        style={{ width: options.size, height: options.size }}
        unoptimized
        width={options.size}
      />
    );
  }

  const initials = options.name
    .split(" ")
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand"
      style={{ width: options.size, height: options.size }}
    >
      {initials}
    </span>
  );
}
