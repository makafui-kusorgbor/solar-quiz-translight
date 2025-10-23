import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root to avoid incorrect workspace root inference on Windows.
    root: __dirname,
  },
};

export default nextConfig;
