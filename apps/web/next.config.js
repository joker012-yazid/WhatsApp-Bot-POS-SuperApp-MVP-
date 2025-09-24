/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  transpilePackages: ['@repo/ui'],
  i18n: {
    locales: ['en', 'ms'],
    defaultLocale: 'en'
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
