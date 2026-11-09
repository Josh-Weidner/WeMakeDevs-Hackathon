import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (deploy/k8s).
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
};

export default nextConfig;
