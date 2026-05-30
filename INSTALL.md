# Installing & running Nivara (landing-forge)

Works the same on **macOS**, **Linux**, and **Windows**. There is one installer
(`scripts/setup.mjs`) with a friendly launcher per platform.

## 1. Prerequisite: Node.js 20+

Everything else is installed for you. You only need Node 20 or newer.

| Platform | Install command |
| --- | --- |
| macOS (Homebrew) | `brew install node` — or `nvm install 20 && nvm use 20` |
| Windows | `winget install OpenJS.NodeJS.LTS` — or download from [nodejs.org](https://nodejs.org) |
| Linux | `nvm install 20 && nvm use 20` — or your distro's package manager |

Check it: `node --version` → should print `v20.x` or higher.

> This repo has an `.nvmrc`, so with [nvm](https://github.com/nvm-sh/nvm) you can
> just run `nvm use` from the project folder.

## 2. Run the installer

From the `landing-forge/` folder:

### macOS / Linux

```bash
chmod +x setup.sh   # first time only
./setup.sh
```

### Windows (PowerShell)

```powershell
.\setup.ps1
```

If PowerShell blocks it ("running scripts is disabled"), either allow scripts once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

…or run it without changing policy:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

### Any platform (no launcher)

```bash
npm run setup
```

The installer will:

1. Verify your Node version (20+).
2. Create `.env` and `.env.local` from the templates if they don't exist.
3. Install npm dependencies (`npm ci`, falling back to `npm install`).
4. Generate the Prisma client.
5. Apply database migrations — **non-destructive**, so existing data is kept.
6. Ensure runtime folders exist (`public/uploads`, `public/generated`, `generated`).

> **Your already-generated statics are safe.** The default setup never drops the
> database and never deletes files in `public/uploads` or `public/generated` — it
> only applies new migrations and creates missing folders. Existing brands,
> landers, and generated images survive re-running setup.

## 3. Add your API keys

Open `.env.local` and fill in:

```ini
ANTHROPIC_API_KEY="..."   # Claude — image analysis & the agent swarm
GOOGLE_API_KEY="..."      # Gemini — image generation
```

The app boots without these, but AI features (analysis / generation) won't work
until they're set.

## 4. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>.

## Optional

| Command | What it does |
| --- | --- |
| `npm run setup:seed` | Run setup **and** load a realistic test corpus |
| `npm run seed` | Load test data into an already-installed project |
| `npm run db:studio` | Open Prisma Studio to browse the database |
| `npm run dev:lan` | Serve on your LAN (port 3001) |
| `./setup.sh --reset` / `.\setup.ps1 --reset` | ⚠️ Drop & recreate the DB (wipes static/brand/lander **records** — image files on disk remain, but won't be listed) |

## Troubleshooting

- **`better-sqlite3` build error on install.** It ships prebuilt binaries for
  most setups; if yours compiles from source it needs build tools:
  - macOS: `xcode-select --install`
  - Windows: install the "Desktop development with C++" workload from Visual
    Studio Build Tools, then re-run setup.
  - Linux: `sudo apt install build-essential python3`
- **Port 3000 already in use.** Run `npm run dev -- -p 3001`.
- **Prisma can't find the database.** Make sure you're in the `landing-forge/`
  folder; `DATABASE_URL` in `.env` is `file:./dev.db` (project-root relative).
