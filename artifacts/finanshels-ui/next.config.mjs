/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the live dev server isolated from production builds. Sharing `.next`
  // lets a concurrent build replace the dev CSS/chunk manifest and causes
  // browser requests for layout.css and main-app.js to return 404.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
