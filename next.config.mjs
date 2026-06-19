/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three / R3F / drei ship modern ESM; transpiling keeps older bundlers happy.
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;
