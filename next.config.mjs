/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three ships modern ESM; transpiling keeps older bundlers happy. (R3F and
  // drei used to be listed here, but nothing imports them any more.)
  transpilePackages: ['three'],
};

export default nextConfig;
