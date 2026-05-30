"use client";

import { useState } from "react";

// Sticky preview iframe above the section editor. Client component so the
// user can collapse it, and so we can cache-bust the src on every render
// (keyed off the lander's updatedAt timestamp from the parent).
export function LanderPreview({
  previewUrl,
  cacheKey,
  title,
}: {
  /** Public URL the stitched HTML lives at, e.g. /landers-preview/<slug>/index.html */
  previewUrl: string;
  /** Stringified updatedAt — used as the ?v= query param so browsers
   *  reload the iframe whenever the lander regenerates. */
  cacheKey: string;
  title: string;
}) {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState<"compact" | "tall">("compact");

  const urlWithCacheBust = `${previewUrl}?v=${encodeURIComponent(cacheKey)}`;

  return (
    <section className="rounded-2xl border border-white/6 bg-white/2 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-xs text-amber-300">
            ◉
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Live preview
            </p>
            <p className="text-xs text-zinc-300">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {open && (
            <>
              <button
                type="button"
                onClick={() => setHeight((h) => (h === "compact" ? "tall" : "compact"))}
                className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-1 text-zinc-300 hover:border-white/14"
              >
                {height === "compact" ? "Expand" : "Shrink"}
              </button>
              <a
                href={urlWithCacheBust}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-1 text-zinc-300 hover:border-white/14"
              >
                Open in new tab ↗
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-white/8 bg-white/3 px-2.5 py-1 text-zinc-300 hover:border-white/14"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <div
          className={
            "overflow-hidden rounded-b-2xl bg-white " +
            (height === "compact" ? "h-[500px]" : "h-[calc(100vh-220px)]")
          }
        >
          <iframe
            key={cacheKey}
            src={urlWithCacheBust}
            title={`Preview of ${title}`}
            sandbox="allow-same-origin"
            className="h-full w-full border-0"
          />
        </div>
      )}
    </section>
  );
}
