"use client";

import { useActionState, useMemo, useState } from "react";

import type { LanderType } from "@/lib/lander-project/types";

import { type NewLanderState, submitNewLanderAction } from "./actions";

// Shape the server component passes in. Kept narrow on purpose so nothing
// leaks from server-only Prisma types into the client bundle.
type TemplateSummary = {
  type: LanderType;
  label: string;
  blurb: string;
  presets: Array<{ id: string; name: string; description: string }>;
  intake: Array<{
    id: string;
    label: string;
    placeholder: string;
    hint: string;
    required: boolean;
    type: "text" | "textarea" | "select";
    options: string[];
  }>;
  sections: string[];
};

type StaticSummary = {
  id: string;
  url: string;
  updatedAt: string;
};

const INITIAL: NewLanderState = { status: "idle" };

// Single-page form with live type + preset + static selection. Keeps
// everything in client state and serializes the selected static ids into
// a hidden field so the server action stays plain FormData.
export function LanderNewForm({
  templates,
  statics,
}: {
  templates: TemplateSummary[];
  statics: StaticSummary[];
}) {
  const [state, formAction, pending] = useActionState(
    submitNewLanderAction,
    INITIAL,
  );

  const [selectedType, setSelectedType] = useState<LanderType>(
    templates[0]?.type ?? "advertorial",
  );
  const activeTemplate = useMemo(
    () => templates.find((t) => t.type === selectedType) ?? templates[0],
    [templates, selectedType],
  );

  const [presetId, setPresetId] = useState<string>(
    activeTemplate?.presets[0]?.id ?? "",
  );

  // Reset preset when the type changes — the old id probably doesn't
  // exist on the new template.
  const [lastType, setLastType] = useState<LanderType>(selectedType);
  if (lastType !== selectedType) {
    setLastType(selectedType);
    setPresetId(activeTemplate?.presets[0]?.id ?? "");
  }

  const [selectedStatics, setSelectedStatics] = useState<Set<string>>(
    new Set(),
  );
  const toggleStatic = (id: string) =>
    setSelectedStatics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="landerType" value={selectedType} />
      <input type="hidden" name="presetId" value={presetId} />
      <input
        type="hidden"
        name="staticAdIds"
        value={Array.from(selectedStatics).join(",")}
      />

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">
          1. Lander type
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {templates.map((t) => {
            const active = selectedType === t.type;
            return (
              <button
                type="button"
                key={t.type}
                onClick={() => setSelectedType(t.type)}
                className={
                  active
                    ? "rounded-lg border-2 border-amber-500 bg-amber-500/5 p-4 text-left ring-2 ring-amber-500/30"
                    : "rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-left transition-colors hover:border-zinc-600"
                }
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {t.label}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{t.blurb}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-600">
                  {t.sections.length} sections
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">2. Preset</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Picks the palette, fonts, and density. You can swap it later by
          regenerating.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeTemplate?.presets.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={
                  active
                    ? "rounded-md border-2 border-amber-500 bg-amber-500/5 p-3 text-left ring-2 ring-amber-500/30"
                    : "rounded-md border border-zinc-800 bg-zinc-950/50 p-3 text-left transition-colors hover:border-zinc-600"
                }
              >
                <p className="text-xs font-semibold text-zinc-200">{p.name}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">
          3. Approved statics ({selectedStatics.size} selected)
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Optional. Every agent sees the URLs + the Claude prompts that
          created these images and can reference them as visual anchors.
        </p>
        {statics.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500">
            No approved statics yet — skip this step or approve some first.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {statics.map((s) => {
              const isSelected = selectedStatics.has(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleStatic(s.id)}
                  className={
                    isSelected
                      ? "relative overflow-hidden rounded-md border-2 border-amber-500 ring-2 ring-amber-500/30"
                      : "relative overflow-hidden rounded-md border border-zinc-800 transition-colors hover:border-zinc-600"
                  }
                >
                  <div className="relative aspect-square bg-zinc-950">
                    {s.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={s.url}
                        alt="static"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                        no image
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute right-1 top-1 rounded-full bg-amber-500 px-1.5 py-0 text-[9px] font-bold text-zinc-950">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">4. Details</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Title is used for the URL slug. Intake questions are specific to
          the selected lander type — leave blank to let the agents rely on
          your brand docs.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Title
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Acme Kettle Winter 2026"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          {activeTemplate?.intake.map((field) => (
            <div key={field.id}>
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
                {field.label}
                {field.required && (
                  <span className="ml-1 text-amber-400">*</span>
                )}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  name={`intake_${field.id}`}
                  rows={3}
                  placeholder={field.placeholder}
                  className="mt-1 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
              ) : field.type === "select" ? (
                <select
                  name={`intake_${field.id}`}
                  defaultValue=""
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">(skip)</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={`intake_${field.id}`}
                  placeholder={field.placeholder}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
              )}
              {field.hint && (
                <p className="mt-1 text-[11px] text-zinc-500">{field.hint}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs text-zinc-400">
          {activeTemplate?.sections.length ?? 0} sections will be generated
          in parallel. Takes ~60–180 seconds.
        </p>
        <button
          type="submit"
          disabled={pending || !presetId}
          className="rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Queuing lander…" : "Generate lander"}
        </button>
      </div>

      {state.status === "error" && (
        <p className="text-xs text-rose-400">{state.message}</p>
      )}
    </form>
  );
}
