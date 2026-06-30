import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
}

export default nextConfig
