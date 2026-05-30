// Cross-platform installer for Nivara (landing-forge).
//
// One script, runs the same on macOS, Linux, and Windows. It only uses Node
// built-ins, so it works *before* `npm install` — Node itself is the only
// prerequisite. Launch it via:
//
//   node scripts/setup.mjs            # full install + DB migrate
//   node scripts/setup.mjs --seed     # also load the test corpus
//   node scripts/setup.mjs --reset    # drop & recreate the DB, then migrate
//
// Or use the friendly launchers: ./setup.sh (mac/linux) · .\setup.ps1 (windows)

import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Run everything from the project root so relative paths (file:./dev.db, the
// public/ dirs, npm's cwd) all resolve the same way they do at runtime.
process.chdir(ROOT);

const args = new Set(process.argv.slice(2));
const WANT_SEED = args.has("--seed");
const WANT_RESET = args.has("--reset");

const isWindows = process.platform === "win32";
let step = 0;

function banner(msg) {
  console.log(`\n\x1b[1m\x1b[36m[${++step}] ${msg}\x1b[0m`);
}
function ok(msg) {
  console.log(`\x1b[32m  ✓ ${msg}\x1b[0m`);
}
function warn(msg) {
  console.log(`\x1b[33m  ! ${msg}\x1b[0m`);
}
function die(msg) {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m\n`);
  process.exit(1);
}

// Run a shell command, streaming its output. shell:true lets us call `npm`
// and `npx` portably (they're npm.cmd / npx.cmd on Windows).
function run(command, { optional = false } = {}) {
  console.log(`\x1b[90m  $ ${command}\x1b[0m`);
  const res = spawnSync(command, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    if (optional) {
      warn(`command failed (continuing): ${command}`);
      return false;
    }
    die(`command failed: ${command}`);
  }
  return true;
}

// ── 1. Node version ────────────────────────────────────────────────────────
banner("Checking Node.js version");
const major = Number(process.versions.node.split(".")[0]);
if (Number.isNaN(major) || major < 20) {
  die(
    `Node 20+ is required (you have ${process.versions.node}).\n` +
      `  Install it from https://nodejs.org or via a version manager:\n` +
      `    macOS/Linux:  nvm install 20 && nvm use 20\n` +
      `    Windows:      winget install OpenJS.NodeJS.LTS   (or use nvm-windows)`,
  );
}
ok(`Node ${process.versions.node} on ${process.platform}/${process.arch}`);

// ── 2. Environment files ───────────────────────────────────────────────────
banner("Setting up environment files");

// .env — read by the Prisma CLI (migrations, generate). Safe to commit.
const envPath = path.join(ROOT, ".env");
if (!existsSync(envPath)) {
  writeFileSync(
    envPath,
    "# Read by the Prisma CLI (migrations, generate, studio).\n" +
      'DATABASE_URL="file:./dev.db"\n',
  );
  ok("created .env (DATABASE_URL)");
} else {
  ok(".env already present");
}

// .env.local — runtime secrets (API keys). Gitignored.
const envLocalPath = path.join(ROOT, ".env.local");
const envLocalExample = path.join(ROOT, ".env.local.example");
let secretsMissing = false;
if (!existsSync(envLocalPath)) {
  if (existsSync(envLocalExample)) {
    copyFileSync(envLocalExample, envLocalPath);
    ok("created .env.local from .env.local.example");
  } else {
    writeFileSync(
      envLocalPath,
      'ANTHROPIC_API_KEY=""\nGOOGLE_API_KEY=""\n',
    );
    ok("created .env.local (template)");
  }
  secretsMissing = true;
} else {
  ok(".env.local already present");
}

// Warn if the API keys are still blank — the app boots without them but
// image analysis / generation features will fail.
try {
  const local = readFileSync(envLocalPath, "utf8");
  const blank = (k) =>
    new RegExp(`^\\s*${k}\\s*=\\s*("")?\\s*$`, "m").test(local);
  if (blank("ANTHROPIC_API_KEY") || blank("GOOGLE_API_KEY")) secretsMissing = true;
} catch {
  /* ignore */
}

// ── 3. Install dependencies ────────────────────────────────────────────────
banner("Installing npm dependencies (this can take a few minutes)");
// `npm ci` is faster & reproducible when the lockfile is in sync; fall back to
// `npm install` if ci can't be used (no lockfile or out-of-sync).
const haveLock = existsSync(path.join(ROOT, "package-lock.json"));
if (!haveLock || !run("npm ci", { optional: true })) {
  run("npm install");
}
ok("dependencies installed");

// ── 4. Prisma client + database ────────────────────────────────────────────
banner("Generating Prisma client");
run("npx prisma generate");
ok("Prisma client generated");

if (WANT_RESET) {
  banner("Resetting database (drop + recreate + migrate)");
  warn(
    "--reset DROPS all DB rows, including records for already-generated statics.",
  );
  warn(
    "Image files on disk (public/uploads, public/generated) are NOT deleted,",
  );
  warn("but the app will no longer list them. Skip --reset to keep everything.");
  run("npx prisma migrate reset --force");
  ok("database reset & migrated");
} else {
  // Default path is non-destructive: migrate deploy only applies *new*
  // migrations and never drops data, so existing brands, landers and
  // already-generated statics (rows + image files) are preserved.
  banner("Applying database migrations (non-destructive)");
  run("npx prisma migrate deploy");
  ok("database is up to date — existing data preserved (dev.db)");
}

// ── 5. Runtime directories ─────────────────────────────────────────────────
// mkdir is recursive and idempotent: it only creates missing folders and
// never touches files already inside them, so generated statics survive.
banner("Ensuring runtime directories exist (existing files kept)");
for (const dir of ["public/uploads", "public/generated", "generated"]) {
  mkdirSync(path.join(ROOT, dir), { recursive: true });
}
ok("public/uploads, public/generated, generated");

// ── 6. Optional seed ───────────────────────────────────────────────────────
if (WANT_SEED) {
  banner("Seeding test data");
  run("node scripts/seed-test-data.mjs");
  ok("test corpus loaded");
}

// ── Done ───────────────────────────────────────────────────────────────────
console.log("\n\x1b[1m\x1b[32m✓ Setup complete.\x1b[0m");
if (secretsMissing) {
  console.log(
    "\n\x1b[33mBefore using AI features, add your API keys to .env.local:\x1b[0m\n" +
      "    ANTHROPIC_API_KEY=...   (Claude — image analysis / agent swarm)\n" +
      "    GOOGLE_API_KEY=...      (Gemini — image generation)\n",
  );
}
console.log("Next steps:");
console.log("    npm run dev          # start the dev server → http://localhost:3000");
if (!WANT_SEED) console.log("    npm run seed         # (optional) load realistic test data");
console.log(
  isWindows
    ? "    npm run dev:lan      # expose on your LAN (run .\\scripts\\open-firewall.ps1 first)\n"
    : "    npm run dev:lan      # expose on your LAN\n",
);
