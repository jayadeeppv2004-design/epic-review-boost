/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // sharp + prisma are native deps; keep them external to the server bundle
    serverComponentsExternalPackages: ["sharp", "@prisma/client"],
  },
};

export default nextConfig;
