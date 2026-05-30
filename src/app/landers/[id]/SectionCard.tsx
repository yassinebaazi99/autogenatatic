"use client";

import { useState } from "react";

import {
  clearSectionEditAction,
  regenerateSectionAction,
  saveSectionEditAction,
  toggleLockAction,
} from "./actions";

// Per-section interactive card. Server component passes down plain props —
// no Prisma types leak client-side.

type SectionProps = {
  landerId: string;
  sectionRowId: string;
  sectionId: string;
  label: string;
  status: string;
  locked: boolean;
  orderIndex: number;
  error: string | null;
  output: string | null;
  userEdit: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
};

export function SectionCard(props: SectionProps) {
  const {
    landerId,
    sectionRowId,
    sectionId,
    label,
    status,
    locked,
    orderIndex,
    error,
    output,
    userEdit,
    promptTokens,
    outputTokens,
  } = props;

  const [regenOpen, setRegenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const currentHtml = userEdit ?? output ?? "";
  const isPending = status === "pending" || status === "running";

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            #{orderIndex + 1}
          </span>
          <h2 className="text-sm font-semibold text-zinc-100">{label}</h2>
          <code className="text-[10px] text-zinc-600">{sectionId}</code>
          <StatusPill status={status} />
          {locked && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
              🔒 Locked
            </span>
          )}
          {userEdit && (
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-500/40">
              Hand-edited
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleLockAction}>
            <input type="hidden" name="sectionId" value={sectionRowId} />
            <input type="hidden" name="landerId" value={landerId} />
            <button
              type="submit"
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:border-zinc-600"
            >
              {locked ? "Unlock" : "Lock"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            disabled={isPending}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-200 transition-colors hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editOpen ? "Close edit" : "Edit"}
          </button>
          {!locked && (
            <button
              type="button"
              onClick={() => setRegenOpen((v) => !v)}
              disabled={isPending}
              className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {regenOpen ? "Cancel" : "Regenerate"}
            </button>
          )}
        </div>
      </header>

      {regenOpen && !locked && (
        <form
          action={regenerateSectionAction}
          className="flex flex-col gap-2 border-b border-zinc-800 bg-zinc-950/60 px-4 py-3"
          onSubmit={() => setRegenOpen(false)}
        >
          <input type="hidden" name="sectionId" value={sectionRowId} />
          <input type="hidden" name="landerId" value={landerId} />
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Regeneration note (optional)
          </label>
          <textarea
            name="note"
            rows={2}
            placeholder="e.g. make this a single-tier pricing box, not three"
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-amber-500 px-3 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Re-run this section
            </button>
            <button
              type="button"
              onClick={() => setRegenOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editOpen && (
        <form
          action={saveSectionEditAction}
          className="flex flex-col gap-2 border-b border-zinc-800 bg-zinc-950/60 px-4 py-3"
          onSubmit={() => setEditOpen(false)}
        >
          <input type="hidden" name="sectionId" value={sectionRowId} />
          <input type="hidden" name="landerId" value={landerId} />
          <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Override HTML (stitcher will use this instead of the agent output)
          </label>
          <textarea
            name="userEdit"
            rows={10}
            defaultValue={currentHtml}
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-[11px] text-zinc-200 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-amber-500 px-3 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Save edit
            </button>
            {userEdit && (
              <button
                formAction={clearSectionEditAction}
                type="submit"
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-[11px] font-semibold text-zinc-200 hover:border-zinc-600"
              >
                Revert to agent output
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="px-4 py-4">
        {isPending ? (
          <PendingState status={status} />
        ) : error ? (
          <p className="rounded-md border border-rose-800 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            Failed: {error}
          </p>
        ) : currentHtml ? (
          <details>
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
              Show section source
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-zinc-800 bg-zinc-950/80 p-3 text-[11px] text-zinc-300">
              {currentHtml}
            </pre>
          </details>
        ) : (
          <p className="text-xs text-zinc-500">No output yet.</p>
        )}

        {promptTokens != null && outputTokens != null && (
          <p className="mt-3 text-[10px] text-zinc-600">
            {promptTokens.toLocaleString()} in · {outputTokens.toLocaleString()}{" "}
            out
          </p>
        )}
      </div>
    </article>
  );
}

function PendingState({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-amber-300">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
      {status === "running" ? "Agent is writing…" : "Queued…"}
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
