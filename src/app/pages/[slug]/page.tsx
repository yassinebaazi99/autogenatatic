import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { GenerationPoller } from "./GenerationPoller";
import { regenerateSectionAction } from "./regenerate-actions";

export default async function LandingPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await db.landingPage.findUnique({
    where: { slug },
    include: {
      product: { select: { id: true, name: true } },
      runs: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!page) notFound();

  // outputDir is "public/generated/<slug>" — strip "public/" to get the URL.
  const previewPathBase = `/${page.outputDir.replace(/^public\//, "")}/index.html`;
  // Cache-buster so the iframe re-fetches after a regenerate.
  const latestFinishedMs = page.runs.reduce((acc, run) => {
    if (!run.finishedAt) return acc;
    const t = new Date(run.finishedAt).getTime();
    return t > acc ? t : acc;
  }, 0);
  const previewPath = latestFinishedMs
    ? `${previewPathBase}?t=${latestFinishedMs}`
    : previewPathBase;

  const sectionRuns = page.runs.filter((r) => r.section !== "visual-director");
  const directorRun = page.runs.find((r) => r.section === "visual-director");

  const anyAgentActive = page.runs.some(
    (r) => r.status === "pending" || r.status === "running",
  );
  const allSectionsDone =
    sectionRuns.length > 0 &&
    sectionRuns.every((r) => r.status === "done");
  const showPreview = allSectionsDone && page.status !== "failed";

  return (
    <div className="flex flex-col gap-8">
      <GenerationPoller active={anyAgentActive} />

      <div className="flex flex-col gap-2">
        <Link
          href="/pages"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Pages
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {page.title}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              theme: <span className="text-zinc-300">{page.theme}</span>
              {" · "}product:{" "}
              <span className="text-zinc-300">{page.product.name}</span>
              {" · "}status:{" "}
              <StatusText status={page.status} />
              {" · "}file:{" "}
              <code className="rounded bg-zinc-900 px-1 text-zinc-400">
                {page.outputDir}/index.html
              </code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/generate/${page.product.id}`}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Regenerate all
            </Link>
            {showPreview && (
              <a
                href={previewPath}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Open in new tab
              </a>
            )}
          </div>
        </div>
      </div>

      {page.error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <div className="font-medium text-red-200">Landing page error</div>
          <div className="mt-1 whitespace-pre-wrap">{page.error}</div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Agents
        </h2>
        <ul className="flex flex-col gap-2">
          {page.runs.map((run) => (
            <li key={run.id}>
              <RunRow
                landingPageId={page.id}
                run={{
                  id: run.id,
                  section: run.section,
                  status: run.status,
                  model: run.model,
                  promptTokens: run.promptTokens,
                  outputTokens: run.outputTokens,
                  error: run.error,
                }}
              />
            </li>
          ))}
        </ul>
        {directorRun?.status === "failed" && (
          <p className="text-xs text-amber-400">
            Visual director failed — falling back to the default theme.
          </p>
        )}
      </section>

      {showPreview ? (
        <iframe
          src={previewPath}
          className="h-[calc(100vh-10rem)] w-full rounded-lg border border-zinc-800 bg-white"
          sandbox="allow-scripts"
          title={page.title}
        />
      ) : anyAgentActive ? (
        <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          Agents are still working. This page refreshes every 2 seconds — it
          will flip to a live preview as soon as the last section lands.
        </div>
      ) : null}
    </div>
  );
}

function StatusText({ status }: { status: string }) {
  const color =
    status === "done"
      ? "text-emerald-300"
      : status === "running"
        ? "text-amber-300"
        : status === "failed"
          ? "text-red-300"
          : "text-zinc-400";
  return <span className={color}>{status}</span>;
}

function RunRow({
  landingPageId,
  run,
}: {
  landingPageId: string;
  run: {
    id: string;
    section: string;
    status: string;
    model: string | null;
    promptTokens: number | null;
    outputTokens: number | null;
    error: string | null;
  };
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <StatusDot status={run.status} />
          <span className="text-sm font-medium text-zinc-100">
            {run.section}
          </span>
          {run.model && (
            <span className="text-[11px] text-zinc-500">· {run.model}</span>
          )}
          {run.promptTokens !== null && run.outputTokens !== null && (
            <span className="text-[11px] text-zinc-500">
              · {run.promptTokens}→{run.outputTokens} tok
            </span>
          )}
        </div>
        {run.error && (
          <p className="text-xs text-red-300">{run.error}</p>
        )}
      </div>
      {run.status !== "pending" && run.status !== "running" && (
        <form action={regenerateSectionAction}>
          <input type="hidden" name="landingPageId" value={landingPageId} />
          <input type="hidden" name="section" value={run.section} />
          <button
            type="submit"
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
          >
            Re-run
          </button>
        </form>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "done"
      ? "bg-emerald-400"
      : status === "running"
        ? "bg-amber-400 animate-pulse"
        : status === "pending"
          ? "bg-zinc-600 animate-pulse"
          : status === "failed"
            ? "bg-red-400"
            : "bg-zinc-700";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}
