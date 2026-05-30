import Link from "next/link";
import { notFound } from "next/navigation";

import { parseTags } from "@/lib/adlib/upload";
import { db } from "@/lib/db";

import {
  deleteAdRefAction,
  reanalyzeAdRefAction,
  updateAdRefLabelAction,
  updateAdRefTagsAction,
} from "../actions";
import { AnalysisEditor } from "./AnalysisEditor";
import { AnalysisPoller } from "./AnalysisPoller";

export const dynamic = "force-dynamic";

// /library/[id] — detail view for a single ad ref. Shows the full image,
// metadata, Claude vision analysis, tag/label editors, and the prompt
// history slot (empty until Phase 3 starts logging generation jobs).

export default async function AdRefDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ref = await db.adLibraryRef.findUnique({ where: { id } });
  if (!ref) notFound();

  const tags = parseTags(ref.tags);
  const analysisPending = !ref.analyzedAt;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/library"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← All reference ads
        </Link>
        <form action={deleteAdRefAction}>
          <input type="hidden" name="id" value={ref.id} />
          <button
            type="submit"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-rose-700 hover:text-rose-400"
          >
            Delete ref
          </button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ref.url}
            alt={ref.label ?? ref.filename}
            className="mx-auto max-h-[70vh] w-auto max-w-full rounded"
          />
          <p className="mt-3 text-center text-xs text-zinc-500">
            {ref.filename} · {formatBytes(ref.sizeBytes)} · {ref.mimeType}
          </p>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Label
            </h2>
            <form action={updateAdRefLabelAction} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={ref.id} />
              <input
                name="label"
                defaultValue={ref.label ?? ""}
                placeholder="optional short name"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
              >
                Save
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Tags
            </h2>
            <form action={updateAdRefTagsAction} className="mt-2 space-y-2">
              <input type="hidden" name="id" value={ref.id} />
              <input
                name="tags"
                defaultValue={tags.join(", ")}
                placeholder="before-after, skincare, clinical"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500">
                Comma-separated. Used to filter the library grid and to steer
                future generation runs.
              </p>
              <button
                type="submit"
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
              >
                Save tags
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Claude vision analysis
              </h2>
              <form action={reanalyzeAdRefAction}>
                <input type="hidden" name="id" value={ref.id} />
                <button
                  type="submit"
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Re-run
                </button>
              </form>
            </div>
            {analysisPending ? (
              <div className="mt-3 text-sm text-amber-400">
                Analysis in progress…
                <AnalysisPoller refId={ref.id} />
              </div>
            ) : ref.analysisError ? (
              <p className="mt-3 text-sm text-rose-400">
                Failed: {ref.analysisError}
              </p>
            ) : (
              <AnalysisEditor
                refId={ref.id}
                analysis={ref.analysis ?? ""}
              />
            )}
          </section>

          <section className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Prompt history
            </h2>
            <p className="mt-2 text-xs text-zinc-500">
              Every Nano Banana prompt ever generated from this ref will
              appear here. Empty until Phase 3 (Static Ad Generator) starts
              running jobs.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
