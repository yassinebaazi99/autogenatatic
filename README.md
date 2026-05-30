# Nivara (landing-forge)

Creative workflow tool for paid-social: brand knowledge base, static ads, and
landers — all agent-driven. Local-first (SQLite + on-disk uploads), single-user.

## Quick start

Requires **Node.js 20+**. Then, from this folder:

### macOS / Linux

```bash
chmod +x setup.sh && ./setup.sh
npm run dev
```

### Windows (PowerShell)

```powershell
.\setup.ps1
npm run dev
```

Or, on any platform: `npm run setup && npm run dev`.

Then open <http://localhost:3000>, and add your `ANTHROPIC_API_KEY` /
`GOOGLE_API_KEY` to `.env.local` to enable AI features.

Re-running setup is safe — it's non-destructive and keeps your existing data and
generated statics.

See **[INSTALL.md](INSTALL.md)** for full instructions, options, and troubleshooting.
