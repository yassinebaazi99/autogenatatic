import type { NextConfig } from "next";

// Build the LAN allow-list dynamically so Nivara works from any machine
// on the user's private network without hand-editing this file. We
// whitelist the whole private IPv4 space and localhost — safe because
// the server is behind the home router and firewall. The list is only
// used by Next.js dev-mode cross-origin checks; it doesn't affect
// production builds.
const ALLOWED_DEV_ORIGINS = [
  "localhost",
  "127.0.0.1",
  // RFC1918 private ranges — covers virtually any LAN a user might
  // reach this dev server from.
  "10.*",
  "172.16.*",
  "172.17.*",
  "172.18.*",
  "172.19.*",
  "172.20.*",
  "172.21.*",
  "172.22.*",
  "172.23.*",
  "172.24.*",
  "172.25.*",
  "172.26.*",
  "172.27.*",
  "172.28.*",
  "172.29.*",
  "172.30.*",
  "172.31.*",
  "192.168.*",
];

const nextConfig: NextConfig = {
  // Whitelist every private LAN address for dev-mode cross-origin checks.
  // Without this, Next 16 blocks /_next/* requests from non-localhost
  // origins and the page loads blank on any PC other than the host.
  allowedDevOrigins: ALLOWED_DEV_ORIGINS,
  experimental: {
    serverActions: {
      // Allow up to ~25MB per submission so the new-product form can carry
      // multiple product photos. Hard cap at 10 files * 5MB in the UI, this
      // leaves headroom for the form fields + overhead.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
