import Link from "next/link";

import { db } from "@/lib/db";
import {
  IMAGE_ROLE_LABELS,
  isGenerating,
  normalizeStatus,
  STATIC_AD_STATUS_LABELS,
} from "@/lib/static-gen/status";

import {
  discardStaticAdAction,
  hardDeleteStaticAdAction,
  setStaticAdStatusAction,
} from "./actions";
import { ImageRoleSelector } from "./ImageRoleSelector";
import { RegenerateForm } from "./RegenerateForm";
import { ReviewPoller } from "./ReviewPoller";

export const dynamic = "force-dynamic";

// /statics/review — live grid of generated images for the landing page.
// Filters by jobId when the query param is present; otherwise shows every
// non-archived image across all jobs so the user can catch up on a queue.
export default async function StaticsReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

  const staticAds = await db.staticAd.findMany({
    where: {
      ...(jobId ? { jobId } : {}),
      // Hide both legacy "discarded" and new "archived".
      status: { notIn: ["discarded", "archived"] },
    },
    include: {
      adLibraryRef: {
        select: { id: true, filename: true, label: true, url: true },
      },
      job: { select: { id: true, status: true, createdAt: true } },
    },
    orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
  });

  const anyPending = staticAds.some((s) =>
    isGenerating({ claudePrompt: s.claudePrompt, error: s.error }),
  );

  const job = jobId
    ? await db.job.findUnique({ where: { id: jobId } })
    : null;

  return (
    <div className="space-y-10">
      <ReviewPoller anyPending={anyPending} />

      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
          Image review
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50">
          {jobId ? "Job output" : "All drafts"}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Every generated image is a candidate for a landing-page slot.
          Mark the ones you like as <strong className="text-emerald-400">Ready</strong>,
          tag a role so the lander runner picks the right one for each
          section, and archive the rest.
        </p>
        {job && (
          <p className="text-[11px] text-zinc-500">
            Job {job.id.slice(-8)} · status:{" "}
            <span className="text-zinc-300">{job.status}</span> · started{" "}
            {new Date(job.createdAt).toLocaleString()}
          </p>
        )}
        <div className="flex items-center gap-3 pt-2 text-sm">
          <Link
            href="/statics/new"
            className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-white/14 hover:bg-white/6"
          >
            + New image batch
          </Link>
          <Link
            href="/statics"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Ready queue →
          </Link>
        </div>
      </header>

      {staticAds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/8 bg-white/1.5 p-12 text-center">
          <p className="text-sm text-zinc-500">
            Nothing here yet. Drafts will appear as soon as Claude writes the
            first prompt.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {staticAds.map((s) => {
            const generating = isGenerating({
              claudePrompt: s.claudePrompt,
              error: s.error,
            });
            const normalizedStatus = normalizeStatus(s.status);
            return (
              <article
                key={s.id}
                className="nv-card-hover flex flex-col overflow-hidden rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl"
              >
                <div className="relative aspect-square bg-zinc-950">
                  {generating ? (
                    <GeneratingOverlay />
                  ) : s.error ? (
                    <ErrorOverlay message={s.error} />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={s.url}
                      alt={`image ${s.id}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span
                    className={
                      normalizedStatus === "approved"
                        ? "absolute left-2 top-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40"
                        : normalizedStatus === "draft"
                          ? "absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 ring-1 ring-zinc-700"
                          : "absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40"
                    }
                  >
                    {STATIC_AD_STATUS_LABELS[normalizedStatus] ?? normalizedStatus}
                  </span>
                  {s.role && (
                    <span className="absolute right-2 top-2 rounded-full bg-sky-500/25 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-500/40">
                      {IMAGE_ROLE_LABELS[s.role as keyof typeof IMAGE_ROLE_LABELS] ?? s.role}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-[11px] text-zinc-500">Reference</p>
                    <p className="truncate text-xs text-zinc-300">
                      {s.adLibraryRef?.label ??
                        s.adLibraryRef?.filename ??
                        "(deleted)"}
                    </p>
                  </div>

                  {!generating && !s.error && (
                    <ImageRoleSelector
                      staticAdId={s.id}
                      currentRole={s.role}
                    />
                  )}

                  {s.claudePrompt && (
                    <details className="text-[11px] text-zinc-500">
                      <summary className="cursor-pointer hover:text-zinc-300">
                        Claude prompt
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/6 bg-white/2 p-2 text-zinc-400">
                        {s.claudePrompt}
                      </p>
                    </details>
                  )}

                  {s.regenNote && (
                    <p className="text-[11px] text-amber-300">
                      Regen note: {s.regenNote}
                    </p>
                  )}

                  {!generating && (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {normalizedStatus !== "approved" ? (
                        <form action={setStaticAdStatusAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button
                            type="submit"
                            disabled={!!s.error}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Mark ready
                          </button>
                        </form>
                      ) : (
                        <form action={setStaticAdStatusAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button
                            type="submit"
                            className="rounded-lg border border-white/8 bg-white/3 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:border-white/14"
                          >
                            Unready
                          </button>
                        </form>
                      )}

                      <RegenerateForm staticAdId={s.id} />

                      <form action={discardStaticAdAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-white/6 px-2 py-1 text-[11px] text-zinc-500 hover:border-amber-500/40 hover:text-amber-300"
                        >
                          Archive
                        </button>
                      </form>

                      <form action={hardDeleteStaticAdAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-white/6 px-2 py-1 text-[11px] text-zinc-500 hover:border-rose-500/40 hover:text-rose-300"
                          title="Permanently delete — removes the row and the file from disk"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GeneratingOverlay() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-xs text-amber-300">
        <span className="nv-pulse inline-block h-6 w-6 rounded-full bg-amber-500/30 ring-2 ring-amber-500" />
        Generating…
      </div>
    </div>
  );
}

function ErrorOverlay({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 text-center">
      <p className="text-xs text-rose-400">{message}</p>
    </div>
  );
}
