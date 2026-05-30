import Link from "next/link";

import { db } from "@/lib/db";
import { LANDER_TYPE_LABELS, type LanderType } from "@/lib/lander-project/types";

import { deleteLanderAction } from "./[id]/actions";

export const dynamic = "force-dynamic";

// /landers — flat list of every lander generated so far. Ordered newest
// first. Clicking a row opens the section editor.
export default async function LandersIndex() {
  const landers = await db.lander.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sections: true, staticsUsed: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Landers
          </p>
          <h1 className="text-3xl font-semibold text-zinc-100">
            Generated landing pages
          </h1>
        </div>
        <Link
          href="/landers/new"
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          + New lander
        </Link>
      </header>

      {landers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <p className="text-sm text-zinc-500">
            No landers yet.{" "}
            <Link href="/landers/new" className="text-amber-400 underline">
              Generate your first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Preset</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Sections</th>
                <th className="px-4 py-2 text-right">Statics</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {landers.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-900/40">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-sm text-zinc-200">{l.title}</p>
                    <p className="truncate text-[10px] text-zinc-500">
                      /{l.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-300">
                    {LANDER_TYPE_LABELS[l.landerType as LanderType] ??
                      l.landerType}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {l.presetId}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={l.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400">
                    {l._count.sections}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-400">
                    {l._count.staticsUsed}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/landers/${l.id}`}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        Open →
                      </Link>
                      <form action={deleteLanderAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-white/6 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-rose-500/40 hover:text-rose-300"
                          title="Delete lander"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "done"
      ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40"
      : status === "failed"
        ? "rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/40"
        : "rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40";
  return <span className={cls}>{status}</span>;
}
