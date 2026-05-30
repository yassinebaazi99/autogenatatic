import Link from "next/link";

import { db } from "@/lib/db";

export const metadata = {
  title: "Pages · Landing Forge",
};

export default async function PagesIndex() {
  const pages = await db.landingPage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Generated Pages
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Every landing page written to{" "}
          <code className="rounded bg-zinc-900 px-1 text-xs text-zinc-400">
            public/generated/&lt;slug&gt;/
          </code>
          .
        </p>
      </div>

      {pages.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/pages/${page.slug}`}
                className="flex items-start justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-zinc-100">{page.title}</div>
                  <div className="text-xs text-zinc-500">
                    <span className="text-zinc-400">{page.theme}</span>
                    {" · "}
                    from {page.product.name}
                    {" · "}
                    {new Date(page.createdAt).toLocaleString()}
                  </div>
                  {page.error && (
                    <div className="mt-1 text-xs text-red-300">
                      {page.error}
                    </div>
                  )}
                </div>
                <StatusBadge status={page.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center">
      <p className="text-zinc-300">No pages yet.</p>
      <p className="text-sm text-zinc-500">
        Legacy route — new generations will land here once Phase 5 rewrites
        the generator.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "done"
      ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
      : status === "running"
        ? "border-amber-800 bg-amber-950/30 text-amber-300"
        : status === "failed"
          ? "border-red-800 bg-red-950/30 text-red-300"
          : "border-zinc-800 bg-zinc-900 text-zinc-400";
  return (
    <span
      className={`shrink-0 rounded border px-2 py-0.5 text-[11px] uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}
