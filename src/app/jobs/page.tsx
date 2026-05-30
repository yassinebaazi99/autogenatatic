import Link from "next/link";

import { db } from "@/lib/db";

import { deleteJobAction } from "./actions";

export const dynamic = "force-dynamic";

// /jobs — history of every generation run. Phase 3 only surfaces static
// jobs; Phase 5 will light up lander jobs via the same model. Click a row
// to jump back into that job's review page (for static) or lander detail
// (for lander, later).

type JobInputShape = {
  userPrompt?: string;
  angleText?: string | null;
  refIds?: string[];
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const kindFilter = params.kind === "static" || params.kind === "lander" ? params.kind : null;

  const jobs = await db.job.findMany({
    where: kindFilter ? { kind: kindFilter } : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { staticAds: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Job History
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          Every generation run
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          A running log of static and lander jobs. Each row shows what was
          asked for and where to find the output. Replay comes later.
        </p>
      </header>

      <div className="flex items-center gap-2 text-xs">
        <FilterChip href="/jobs" label="All" active={!kindFilter} />
        <FilterChip
          href="/jobs?kind=static"
          label="Static"
          active={kindFilter === "static"}
        />
        <FilterChip
          href="/jobs?kind=lander"
          label="Lander"
          active={kindFilter === "lander"}
        />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <p className="text-sm text-zinc-500">No jobs yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Prompt</th>
                <th className="px-4 py-2">Outputs</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {jobs.map((job) => {
                const input = parseInput(job.input);
                const href =
                  job.kind === "static"
                    ? `/statics/review?jobId=${job.id}`
                    : `/landers/${job.id}`;
                return (
                  <tr
                    key={job.id}
                    className="hover:bg-zinc-900/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                        {job.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusPill status={job.status} />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-xs text-zinc-300">
                        {input.userPrompt ?? "—"}
                      </p>
                      {input.angleText && (
                        <p className="truncate text-[10px] text-zinc-500">
                          angle doc attached
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {job._count.staticAds} statics
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={href}
                          className="text-xs text-amber-400 hover:text-amber-300"
                        >
                          Open →
                        </Link>
                        <form action={deleteJobAction}>
                          <input type="hidden" name="id" value={job.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-white/6 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-rose-500/40 hover:text-rose-300"
                            title="Delete job (cascades to statics + lander output)"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseInput(raw: string): JobInputShape {
  try {
    return JSON.parse(raw) as JobInputShape;
  } catch {
    return {};
  }
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-300"
          : "rounded-full border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      }
    >
      {label}
    </Link>
  );
}

function JobStatusPill({ status }: { status: string }) {
  const cls =
    status === "done"
      ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40"
      : status === "failed"
        ? "rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/40"
        : status === "running" || status === "queued"
          ? "rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40"
          : "rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 ring-1 ring-zinc-700";
  return <span className={cls}>{status}</span>;
}
