import Link from "next/link";

import { parseTags } from "@/lib/adlib/upload";
import { db } from "@/lib/db";

import { StaticNewForm } from "./StaticNewForm";

export const dynamic = "force-dynamic";

// /statics/new — one-page form with free-text prompt, optional angle
// doc attachment, and a full-width multi-select grid of the user's ad
// library. Submit fires a Static generation job.
export default async function StaticNewPage() {
  const refs = await db.adLibraryRef.findMany({
    orderBy: { createdAt: "desc" },
  });

  const plainRefs = refs.map((r) => ({
    id: r.id,
    filename: r.filename,
    label: r.label,
    url: r.url,
    tags: parseTags(r.tags),
    analyzed: !!r.analyzedAt,
    hasError: !!r.analysisError,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Static Ad Generator
        </p>
        <h1 className="text-3xl font-semibold text-zinc-100">
          New generation job
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Write your direction, optionally attach an angle doc, then pick
          the reference ads you want to emulate. Claude will write one
          Nano Banana prompt per ref and Gemini will generate the images.
          Review lands in the next step.
        </p>
      </header>

      {plainRefs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <p className="text-sm text-zinc-500">
            No reference ads in your library yet.{" "}
            <Link href="/library" className="text-amber-400 underline">
              Upload some first
            </Link>{" "}
            and come back.
          </p>
        </div>
      ) : (
        <StaticNewForm refs={plainRefs} />
      )}
    </div>
  );
}
