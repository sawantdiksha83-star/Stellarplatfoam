/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode during E2E tests to prevent double-render issues with Playwright
  reactStrictMode: !process.env.PLAYWRIGHT_TEST,
  
  webpack: (config) => {
    // Handle jsPDF and other PDF libraries
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
