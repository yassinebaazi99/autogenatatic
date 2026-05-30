// Server component. Live-refreshed via the existing LanderPoller on the
// parent page — when a section flips status, the parent re-renders and
// this timeline shows the new state. No new polling needed.

type SectionRow = {
  id: string;
  sectionId: string;
  label: string;
  orderIndex: number;
  status: string;
  locked: boolean;
  promptTokens: number | null;
  outputTokens: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
};

export function ActivityLog({ sections }: { sections: SectionRow[] }) {
  // Roll up totals for the header line.
  const done = sections.filter((s) => s.status === "done");
  const failed = sections.filter((s) => s.status === "failed");
  const running = sections.filter((s) => s.status === "running");
  const totalInputTokens = done.reduce(
    (sum, s) => sum + (s.promptTokens ?? 0),
    0,
  );
  const totalOutputTokens = done.reduce(
    (sum, s) => sum + (s.outputTokens ?? 0),
    0,
  );

  return (
    <section className="rounded-2xl border border-white/6 bg-white/2 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Activity
        </h3>
        <span className="text-[10px] text-zinc-600">
          {done.length}/{sections.length} done
        </span>
      </div>

      {(totalInputTokens > 0 || running.length > 0 || failed.length > 0) && (
        <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
          {totalInputTokens > 0 && (
            <span>
              <span className="text-zinc-400">
                {formatTokens(totalInputTokens)}
              </span>{" "}
              in ·{" "}
              <span className="text-zinc-400">
                {formatTokens(totalOutputTokens)}
              </span>{" "}
              out
            </span>
          )}
          {running.length > 0 && (
            <span className="text-amber-400">
              {running.length} running
            </span>
          )}
          {failed.length > 0 && (
            <span className="text-rose-400">{failed.length} failed</span>
          )}
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {sections.map((s) => (
          <ActivityRow key={s.id} section={s} />
        ))}
      </ol>
    </section>
  );
}

function ActivityRow({ section }: { section: SectionRow }) {
  const elapsed =
    section.finishedAt && section.startedAt
      ? formatElapsed(
          section.finishedAt.getTime() - section.startedAt.getTime(),
        )
      : null;

  return (
    <li className="flex items-start gap-2.5 text-[11px]">
      <StatusDot status={section.status} locked={section.locked} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-zinc-300">{section.label}</span>
          {elapsed && (
            <span className="shrink-0 text-[10px] text-zinc-600">{elapsed}</span>
          )}
        </div>
        <p className="truncate text-[10px] text-zinc-600">
          {section.status === "done" && section.outputTokens != null ? (
            <>
              {formatTokens(section.outputTokens)} out
              {section.promptTokens != null && (
                <>
                  {" "}
                  · {formatTokens(section.promptTokens)} in
                </>
              )}
            </>
          ) : section.status === "failed" ? (
            <span className="text-rose-400">
              {(section.error ?? "failed").slice(0, 60)}
            </span>
          ) : section.status === "running" ? (
            <span className="text-amber-400">writing…</span>
          ) : section.locked ? (
            <span className="text-amber-400">locked — skipped</span>
          ) : (
            <span>queued</span>
          )}
        </p>
      </div>
    </li>
  );
}

function StatusDot({
  status,
  locked,
}: {
  status: string;
  locked: boolean;
}) {
  if (locked) {
    return (
      <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[8px] text-amber-300 ring-1 ring-amber-500/40">
        🔒
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-zinc-950">
        ✓
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-zinc-950">
        ✗
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="nv-pulse mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
    );
  }
  // pending
  return (
    <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/15 bg-transparent" />
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}t`;
  if (n < 10_000) return `${(n / 1000).toFixed(1)}kt`;
  return `${Math.round(n / 1000)}kt`;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m${Math.round(s - m * 60)}s`;
}
