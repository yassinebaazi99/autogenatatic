import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "autogenatatic",
  description:
    "Creative workflow tool for paid-social: brand knowledge base, static ads, and landers — all agent-driven.",
};

// Nav structure — grouped so the sidebar breathes. Keep sections small; the
// wizard lives at the top because it's the primary journey users take.
type NavItem = {
  href: string;
  label: string;
  description?: string;
  /** Emoji or inline single-char glyph — keeps bundle size tiny, avoids icon
   *  libraries for v1. Upgrade to lucide later if we want outlined icons. */
  glyph: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Create",
    items: [
      {
        href: "/studio/new",
        label: "New lander wizard",
        description: "Start a guided build",
        glyph: "✦",
      },
      {
        href: "/statics/new",
        label: "New image batch",
        description: "Generate page imagery",
        glyph: "◆",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/brand",
        label: "Brand",
        description: "Knowledge base",
        glyph: "◐",
      },
      {
        href: "/brand/project-files",
        label: "Project files",
        description: "Per-lander-type inputs",
        glyph: "◫",
      },
      {
        href: "/library",
        label: "Reference library",
        description: "Inspiration images",
        glyph: "▤",
      },
    ],
  },
  {
    label: "Output",
    items: [
      {
        href: "/statics",
        label: "Images",
        description: "Ready for landers",
        glyph: "▣",
      },
      {
        href: "/landers",
        label: "Landers",
        description: "Generated pages",
        glyph: "◉",
      },
    ],
  },
  {
    label: "History",
    items: [
      {
        href: "/jobs",
        label: "Jobs",
        description: "Every run",
        glyph: "⟳",
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen">
        {/* Mobile top bar — hidden on ≥lg where the sidebar takes over. */}
        <header className="flex h-14 items-center justify-between border-b border-white/6 bg-[#0a0a0b]/80 px-5 backdrop-blur-xl lg:hidden">
          <Link href="/studio/new" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
            <span className="text-sm font-semibold tracking-tight text-zinc-50">
              Nivara
            </span>
          </Link>
          <Link
            href="/studio/new"
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400"
          >
            New lander
          </Link>
        </header>

        {/* Desktop shell: fixed sidebar + main column. */}
        <div className="flex">
          <Sidebar />

          <main className="min-h-screen flex-1 lg:pl-[260px]">
            <div className="mx-auto w-full max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/6 bg-[#0a0a0b]/90 px-4 py-5 backdrop-blur-xl lg:flex">
      <Link
        href="/studio/new"
        className="group mb-8 flex items-center gap-3 px-2"
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-xs font-bold text-zinc-950 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.45)]">
          N
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-zinc-50">
            Nivara
          </span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            Creative studio
          </span>
        </div>
      </Link>

      <Link
        href="/studio/new"
        className="nv-card-hover mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-linear-to-br from-amber-500/15 to-amber-500/5 px-3 py-3 text-xs"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-sm text-amber-300">
          ✦
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            Start a lander
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Guided wizard →
          </p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-400 hover:bg-white/4 hover:text-zinc-100"
                  >
                    <span className="flex h-6 w-6 items-center justify-center text-xs text-zinc-500 group-hover:text-amber-400">
                      {item.glyph}
                    </span>
                    <div className="flex-1">
                      <p className="text-[13px] text-inherit">{item.label}</p>
                      {item.description && (
                        <p className="text-[10px] text-zinc-600 group-hover:text-zinc-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 rounded-xl border border-white/6 bg-white/2 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Local · single-user
        </p>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">
          All data lives in{" "}
          <code className="text-zinc-400">prisma/dev.db</code> and
          <br />
          <code className="text-zinc-400">public/uploads/</code>.
        </p>
      </div>
    </aside>
  );
}
