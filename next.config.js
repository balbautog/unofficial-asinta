/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // "/" is the canonical authentication URL. Legacy login portals redirect
    // permanently (308); the middleware provides the same guarantee as a
    // fallback for any other /login/* path.
    return [
      { source: '/login', destination: '/', permanent: true },
      { source: '/login/:path*', destination: '/', permanent: true },
    ];
  },
  images: {
    domains: ['images.unsplash.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
