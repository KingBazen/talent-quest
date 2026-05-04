/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  experimental: {
    // Neon's serverless driver opens a real WebSocket via the `ws` package,
    // whose conditional native helpers (bufferutil, utf-8-validate) break when
    // bundled by webpack ("bufferUtil.mask is not a function"). Marking these
    // packages as external lets Node resolve them at runtime.
    serverComponentsExternalPackages: [
      "@neondatabase/serverless",
      "ws",
      "bcryptjs",
    ],
  },
};

export default nextConfig;
