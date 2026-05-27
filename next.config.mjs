import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 用 experimental.serverComponentsExternalPackages
  // 这些包含 native .node binary，webpack 无法打包，必须标记为 external
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js", "satori"],
  },
};

export default withNextIntl(nextConfig);
