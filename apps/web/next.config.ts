import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env.NODE_ENV ?? "development"),
      },
    ];
  },
};

export default nextConfig;
