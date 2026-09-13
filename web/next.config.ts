import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone: the server plus only the node_modules it actually
  // reached. That is what the Dockerfile copies, and it is the difference
  // between a ~180MB image and a ~1GB one.
  output: "standalone",
};

export default nextConfig;
