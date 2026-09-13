import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone: the server plus only the node_modules it actually
  // reached. That is what the Dockerfile copies.
  output: "standalone",

  turbopack: {
    // Pinned because the repo root has a lockfile of its own, and inferring the
    // root from the nearest one upward picks the wrong directory.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
