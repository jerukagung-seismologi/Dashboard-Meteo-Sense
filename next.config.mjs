/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingExcludes: {
    '*': [
      '**/*.db',
      '**/*.db-journal',
      '**/*.sqlite',
      '**/*.sqlite3',
    ],
  },
}

export default nextConfig