import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // packages/core se publica como TypeScript sin compilar: Next debe transpilarlo.
  transpilePackages: ['@arbolapp/core'],
};

export default nextConfig;
