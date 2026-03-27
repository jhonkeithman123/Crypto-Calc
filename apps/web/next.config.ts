import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@crypto/cipher-core", "@crypto/cipher-contract"],
};

export default nextConfig;
