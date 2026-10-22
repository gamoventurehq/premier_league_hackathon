import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required per ADR 0008: Keep cacheComponents false for live match telemetry stream
  reactStrictMode: true,
};

export default nextConfig;
