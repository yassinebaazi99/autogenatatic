// Print every LAN-reachable URL for the Nivara dev server.
//
//   node scripts/lan-urls.mjs [port]
//   node scripts/lan-urls.mjs 3001         # explicit port
//   PORT=3000 node scripts/lan-urls.mjs    # via env var
//
// Default port is 3001 (what Next falls back to). The first positional
// arg wins, then PORT env, then 3001.

import os from "node:os";

const PORT =
  (process.argv[2] && Number(process.argv[2])) ||
  (process.env.PORT && Number(process.env.PORT)) ||
  3001;

// Walk every network interface and collect IPv4 addresses that aren't
// loopback (internal). Drop link-local, VirtualBox, WSL, Docker, and
// any other obvious pseudo-interface unless it's the only one.
const interfaces = os.networkInterfaces();
const candidates = [];
for (const [name, addrs] of Object.entries(interfaces)) {
  if (!addrs) continue;
  for (const addr of addrs) {
    if (addr.family !== "IPv4") continue;
    if (addr.internal) continue;
    // Skip 169.254/16 link-local block — those aren't usefully routable.
    if (addr.address.startsWith("169.254.")) continue;
    candidates.push({ name, address: addr.address });
  }
}

// Sort: real LAN (192.168/*, 10.*, 172.16-31.*) first, then everything else.
const LAN_PREFIXES = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];
candidates.sort((a, b) => {
  const aIsLan = LAN_PREFIXES.some((re) => re.test(a.address));
  const bIsLan = LAN_PREFIXES.some((re) => re.test(b.address));
  if (aIsLan && !bIsLan) return -1;
  if (bIsLan && !aIsLan) return 1;
  return a.address.localeCompare(b.address);
});

console.log("");
console.log("  Nivara dev server — LAN URLs (port " + PORT + "):");
console.log("  ────────────────────────────────────────────────");
console.log("  Local       http://localhost:" + PORT);
if (candidates.length === 0) {
  console.log("");
  console.log("  No external network interfaces found.");
  console.log("  The server is only reachable at localhost.");
} else {
  for (const { name, address } of candidates) {
    const label = name.padEnd(10, " ").slice(0, 10);
    console.log(`  ${label}  http://${address}:${PORT}`);
  }
  console.log("");
  console.log("  From another PC on the same network, open any of the");
  console.log("  LAN-prefixed URLs above in a browser.");
}
console.log("");
console.log("  If connections time out, Windows Firewall is probably");
console.log("  blocking inbound traffic on port " + PORT + ". Run:");
console.log("");
console.log(
  "    powershell -ExecutionPolicy Bypass -File scripts/open-firewall.ps1 " +
    PORT,
);
console.log("");
console.log("  (requires an admin PowerShell — right-click the shortcut");
console.log("   and choose 'Run as administrator' before running npm.)");
console.log("");
