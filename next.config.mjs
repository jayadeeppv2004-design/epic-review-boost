/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // sharp + prisma are native deps; keep them external to the server bundle
    serverComponentsExternalPackages: ["sharp", "@napi-rs/canvas", "@prisma/client"],
    // Ensure the embedded poster fonts ship in the serverless function bundle
    // (they are read at runtime by src/lib/poster.ts).
    outputFileTracingIncludes: {
      "/api/qr/[code]": ["./src/assets/fonts/**"],
    },
  },
};

export default nextConfig;
