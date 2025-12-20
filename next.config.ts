import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/cave",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  sw: "sw.js",
  scope: "/",
  publicExcludes: ["!noprecache/**/*"],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
      handler: "NetworkOnly",
      options: {
        cacheName: "supabase-api",
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
      handler: "NetworkOnly",
      options: {
        cacheName: "supabase-auth",
      },
    },
    {
      urlPattern: /\/cave/,
      handler: "NetworkFirst",
      options: {
        cacheName: "cave-page",
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
