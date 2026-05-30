"use client";

import { useActionState, useMemo, useState } from "react";

import { type SubmitState, submitStaticGenJobAction } from "./actions";

// Client form with a prompt textarea, optional angle doc upload, and a
// multi-select grid of the ad library. Selection state is client-local;
// on submit we serialize the picked ref ids as a hidden field so the
// server action gets them without needing a separate step.

type RefCard = {
  id: string;
  filename: string;
  label: string | null;
  url: string;
  tags: string[];
  analyzed: boolean;
  hasError: boolean;
};

const INITIAL: SubmitState = { status: "idle" };

export function StaticNewForm({ refs }: { refs: RefCard[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    submitStaticGenJobAction,
    INITIAL,
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of refs) {
      for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [refs]);

  const visibleRefs = filterTag
    ? refs.filter((r) => r.tags.includes(filterTag))
    : refs;

  const toggleRef = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(visibleRefs.map((r) => r.id)));
  };
  const clearAll = () => setSelected(new Set());

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden field carries the selection through to the server action. */}
      <input
        type="hidden"
        name="refIds"
        value={Array.from(selected).join(",")}
      />

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Your direction</h2>
        <p className="mt-1 text-xs text-zinc-500">
          What do you want the new statics to look like or say? Be specific —
          this is the only freeform guidance Claude gets beyond your brand
          docs.
        </p>
        <textarea
          name="userPrompt"
          required
          rows={4}
          placeholder="e.g. workout shot at sunrise, minimalist kitchen background, hero product front and center, warm tan palette, headline 'REAL RESULTS IN 14 DAYS'"
          className="mt-3 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
        />

        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
            Optional angle doc (PDF, DOCX, TXT)
          </label>
          <input
            type="file"
            name="angleDoc"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="mt-1 block w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-200 hover:border-zinc-600"
          />
          <p className="mt-1 text-[10px] text-zinc-500">
            Strategy notes, messaging guidelines, a creative brief — whatever
            adds context. Extracted and injected alongside your brand docs.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Reference ads
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick the ads you want to emulate. One generation per selection.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">
              {selected.size} of {refs.length} selected
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-zinc-800 px-2 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md border border-zinc-800 px-2 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              Clear
            </button>
          </div>
        </div>

        {tagCounts.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500">Filter:</span>
            <button
              type="button"
              onClick={() => setFilterTag(null)}
              className={
                filterTag === null
                  ? "rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-300"
                  : "rounded-full border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-zinc-600"
              }
            >
              All ({refs.length})
            </button>
            {tagCounts.map(([tag, count]) => {
              const active = filterTag === tag;
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setFilterTag(active ? null : tag)}
                  className={
                    active
                      ? "rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-300"
                      : "rounded-full border border-zinc-800 px-3 py-1 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }
                >
                  {tag} <span className="text-zinc-600">· {count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleRefs.map((ref) => {
            const isSelected = selected.has(ref.id);
            return (
              <button
                type="button"
                key={ref.id}
                onClick={() => toggleRef(ref.id)}
                className={
                  isSelected
                    ? "group relative overflow-hidden rounded-lg border-2 border-amber-500 bg-zinc-900/40 text-left ring-2 ring-amber-500/30"
                    : "group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 text-left transition-colors hover:border-zinc-600"
                }
              >
                <div className="relative aspect-square bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ref.url}
                    alt={ref.label ?? ref.filename}
                    className="h-full w-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/10" />
                  )}
                  {isSelected && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                      ✓ PICKED
                    </span>
                  )}
                  {!ref.analyzed && (
                    <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-500/40">
                      Analyzing
                    </span>
                  )}
                  {ref.hasError && (
                    <span className="absolute left-2 top-2 rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-rose-400 ring-1 ring-rose-500/40">
                      Analysis failed
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 p-2">
                  <p className="truncate text-xs font-medium text-zinc-200">
                    {ref.label ?? ref.filename}
                  </p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {ref.tags.join(" · ") || "no tags"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-xs text-zinc-400">
          {selected.size === 0 ? (
            <span>Pick at least one reference to generate.</span>
          ) : (
            <span>
              Ready to generate <strong>{selected.size}</strong>{" "}
              {selected.size === 1 ? "static" : "statics"}. Each one runs
              Claude Opus (prompt) → Gemini 2.5 Flash Image (render).
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Queuing job…" : "Generate statics"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="text-xs text-rose-400">{state.message}</p>
      )}
    </form>
  );
}
