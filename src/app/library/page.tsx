import Link from "next/link";

import { parseTags } from "@/lib/adlib/upload";
import { db } from "@/lib/db";

import { AdRefUploader } from "./AdRefUploader";

export const dynamic = "force-dynamic";

// /library is Nivara's Ad Library — the grid of reference ads that drive
// the static generator. Every upload is analyzed by Claude vision so the
// downstream prompt writer has structured knowledge about the ad's look
// and angle.

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: filterTag } = await searchParams;

  const refs = await db.adLibraryRef.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Tag filtering is done in app code (v1 stores tags as comma-separated
  // text). Normalize once so the filter survives case/whitespace.
  const filtered = filterTag
    ? refs.filter((r) =>
        parseTags(r.tags).some(
          (t) => t.toLowerCase() === filterTag.toLowerCase(),
        ),
      )
    : refs;

  // Collect all tags with counts for the filter strip.
  const tagCounts = new Map<string, number>();
  for (const r of refs) {
    for (const t of parseTags(r.tags)) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const allTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Ad Library
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          Reference ads
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Upload the ads you want to emulate. Each one gets described by
          Claude so the static generator can recreate the look and angle
          for your product. Tag them so you can find them fast.
        </p>
      </header>

      <AdRefUploader />

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Filter:</span>
          {filterTag ? (
            <Link
              href="/library"
              className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-400 hover:border-zinc-500"
            >
              Clear
            </Link>
          ) : (
            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-300">
              All ({refs.length})
            </span>
          )}
          {allTags.map(([tag, count]) => {
            const active = filterTag?.toLowerCase() === tag.toLowerCase();
            return (
              <Link
                key={tag}
                href={`/library?tag=${encodeURIComponent(tag)}`}
                className={
                  active
                    ? "rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-300"
                    : "rounded-full border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }
              >
                {tag} <span className="text-zinc-600">· {count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <p className="text-sm text-zinc-500">
            {refs.length === 0
              ? "No reference ads yet. Drop a few in above to get started."
              : `No ads tagged "${filterTag}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((ref) => (
            <Link
              key={ref.id}
              href={`/library/${ref.id}`}
              className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-600"
            >
              <div className="relative aspect-square bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.url}
                  alt={ref.label ?? ref.filename}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
                <AnalysisBadge
                  analyzed={!!ref.analyzedAt}
                  hasError={!!ref.analysisError}
                />
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-medium text-zinc-200">
                  {ref.label ?? ref.filename}
                </p>
                <p className="truncate text-[10px] text-zinc-500">
                  {parseTags(ref.tags).join(" · ") || "no tags"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisBadge({
  analyzed,
  hasError,
}: {
  analyzed: boolean;
  hasError: boolean;
}) {
  if (!analyzed) {
    return (
      <span className="absolute right-1.5 top-1.5 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-500/40">
        Analyzing…
      </span>
    );
  }
  if (hasError) {
    return (
      <span className="absolute right-1.5 top-1.5 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-rose-400 ring-1 ring-rose-500/40">
        Failed
      </span>
    );
  }
  return null;
}
