import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  sw: "sw.js",
  scope: "/",
  publicExcludes: ["!noprecache/**/*"],
});

export default pwaConfig(nextConfig);
