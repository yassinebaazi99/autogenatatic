import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import {
  LANDER_TYPE_LABELS,
  type LanderType,
} from "@/lib/lander-project/types";

import {
  deleteLanderAction,
  detachStaticFromLanderAction,
} from "./actions";
import { ActivityLog } from "./ActivityLog";
import { LanderPoller } from "./LanderPoller";
import { LanderPreview } from "./LanderPreview";
import { SectionCard } from "./SectionCard";

export const dynamic = "force-dynamic";

// /landers/[id] — section-by-section editor. Layout:
//   header (metadata + primary actions)
//   live preview iframe (collapsible, full-width)
//   main column: section cards
//   sidebar: activity log + visual anchors + output info
export default async function LanderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lander = await db.lander.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      staticsUsed: {
        include: {
          staticAd: {
            select: { id: true, url: true, claudePrompt: true, status: true },
          },
        },
      },
    },
  });
  if (!lander) notFound();

  const anyPending = lander.sections.some(
    (s) => s.status === "pending" || s.status === "running",
  );

  const doneCount = lander.sections.filter((s) => s.status === "done").length;

  // Preview URL routes through public/landers-preview/ to avoid colliding
  // with the /landers/[id] dynamic route. The ?v= cache-buster gets
  // appended inside LanderPreview so iframes reload on each regen.
  const previewUrl = `/landers-preview/${lander.slug}/index.html`;

  // Cache key for the iframe — changes whenever any section updates or the
  // lander itself changes, so the browser fetches fresh HTML.
  const latestTouch = lander.sections.reduce<number>((max, s) => {
    const t = s.finishedAt?.getTime() ?? s.startedAt.getTime();
    return t > max ? t : max;
  }, lander.updatedAt.getTime());
  const cacheKey = String(latestTouch);

  return (
    <div className="space-y-8">
      <LanderPoller anyPending={anyPending} />

      <header className="space-y-3">
        <Link
          href="/landers"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← All landers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
              {LANDER_TYPE_LABELS[lander.landerType as LanderType] ??
                lander.landerType}
              {" · "}
              {lander.presetId}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
              {lander.title}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              status:{" "}
              <span
                className={
                  lander.status === "done"
                    ? "text-emerald-400"
                    : lander.status === "failed"
                      ? "text-rose-400"
                      : "text-amber-300"
                }
              >
                {lander.status}
              </span>{" "}
              · {doneCount} / {lander.sections.length} sections done · slug:{" "}
              <code className="text-zinc-400">{lander.slug}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${previewUrl}?v=${cacheKey}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/8 bg-white/3 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-white/14"
            >
              Open preview ↗
            </a>
            <form action={deleteLanderAction}>
              <input type="hidden" name="id" value={lander.id} />
              <button
                type="submit"
                className="rounded-lg border border-white/6 px-3 py-1.5 text-xs text-zinc-500 hover:border-rose-500/40 hover:bg-rose-500/6 hover:text-rose-300"
                title="Delete this lander and all its sections"
              >
                Delete
              </button>
            </form>
            <Link
              href="/studio/new"
              className="nv-cta rounded-lg px-4 py-2 text-xs"
            >
              + New lander
            </Link>
          </div>
        </div>
        {lander.error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/6 px-3 py-2 text-xs text-rose-300">
            Error: {lander.error}
          </p>
        )}
      </header>

      <LanderPreview
        previewUrl={previewUrl}
        cacheKey={cacheKey}
        title={lander.title}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {lander.sections.map((s) => (
            <SectionCard
              key={s.id}
              landerId={lander.id}
              sectionRowId={s.id}
              sectionId={s.sectionId}
              label={s.label}
              status={s.status}
              locked={s.locked}
              orderIndex={s.orderIndex}
              error={s.error}
              output={s.output}
              userEdit={s.userEdit}
              promptTokens={s.promptTokens}
              outputTokens={s.outputTokens}
            />
          ))}
        </div>

        <aside className="space-y-4">
          <ActivityLog sections={lander.sections} />

          <section className="rounded-2xl border border-white/6 bg-white/2 p-4 backdrop-blur-xl">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Visual anchors
            </h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Approved images attached to this lander. Every section agent
              sees their URLs.
            </p>
            {lander.staticsUsed.length === 0 ? (
              <p className="mt-3 text-[11px] text-zinc-600">
                No images attached.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {lander.staticsUsed.map((link) => (
                  <div
                    key={link.id}
                    className="group relative overflow-hidden rounded-lg border border-white/6 bg-zinc-950 hover:border-white/14"
                    title={link.staticAd.claudePrompt}
                  >
                    <a
                      href={link.staticAd.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {link.staticAd.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={link.staticAd.url}
                          alt="static"
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-[10px] text-zinc-600">
                          no image
                        </div>
                      )}
                    </a>
                    <form action={detachStaticFromLanderAction}>
                      <input type="hidden" name="linkId" value={link.id} />
                      <input
                        type="hidden"
                        name="landerId"
                        value={lander.id}
                      />
                      <button
                        type="submit"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950/85 text-[10px] text-zinc-400 opacity-0 ring-1 ring-white/10 transition-opacity group-hover:opacity-100 hover:bg-rose-500/30 hover:text-rose-200"
                        title="Detach from this lander"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/6 bg-white/2 p-4 backdrop-blur-xl">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Output
            </h3>
            <p className="mt-2 text-[11px] text-zinc-500">
              Stitched HTML lives at:
            </p>
            <code className="mt-1 block break-all text-[10px] text-zinc-400">
              {lander.outputDir}/index.html
            </code>
            <a
              href={`${previewUrl}?v=${cacheKey}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[11px] text-amber-400 hover:text-amber-300"
            >
              Open in new tab ↗
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
