import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@crypto/cipher-core", "@crypto/cipher-contract", "@crypto/modcalc-core"],
};

export default nextConfig;
