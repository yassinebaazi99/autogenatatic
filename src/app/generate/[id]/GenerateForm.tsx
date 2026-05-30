"use client";

import { useActionState, useMemo, useState } from "react";
import type { PlaybookDefinition } from "@/lib/playbooks/types";
import { runGenerateLanding, type GenerateState } from "./actions";

type PlaybookCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  definition: PlaybookDefinition;
};

const initial: GenerateState = { ok: false };

export function GenerateForm({
  productId,
  playbooks,
}: {
  productId: string;
  playbooks: PlaybookCard[];
}) {
  const [state, formAction, pending] = useActionState(
    runGenerateLanding,
    initial,
  );

  const [selectedPlaybookId, setSelectedPlaybookId] = useState(
    playbooks[0]?.id ?? "",
  );
  const selected = useMemo(
    () => playbooks.find((p) => p.id === selectedPlaybookId),
    [playbooks, selectedPlaybookId],
  );
  const [selectedPresetId, setSelectedPresetId] = useState(
    selected?.definition.presets[0]?.id ?? "",
  );

  // When playbook changes, reset the preset to the first one of the new playbook.
  function onPlaybookChange(id: string) {
    setSelectedPlaybookId(id);
    const next = playbooks.find((p) => p.id === id);
    if (next) {
      setSelectedPresetId(next.definition.presets[0]?.id ?? "");
    }
  }

  if (!selected) {
    return (
      <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
        No playbooks found. Restart the dev server to seed the builtins.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="productId" value={productId} />

      {/* Playbook picker */}
      <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Playbook</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Each playbook is a different kind of page — structure, voice, and
            layout are all defined by the playbook.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {playbooks.map((p) => {
            const isSelected = p.id === selectedPlaybookId;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-3 text-sm transition-colors ${
                  isSelected
                    ? "border-amber-400 bg-amber-400/5"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="playbookId"
                    value={p.id}
                    checked={isSelected}
                    onChange={() => onPlaybookChange(p.id)}
                    className="mt-1 accent-amber-400"
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-100">
                        {p.name}
                      </span>
                      {p.isBuiltin && (
                        <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
                          builtin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{p.description}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Preset picker */}
      <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Preset</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Palette, fonts, and layout tokens. Defined by the selected playbook.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {selected.definition.presets.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <label
                key={preset.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-md border px-3 py-3 text-sm transition-colors ${
                  isSelected
                    ? "border-amber-400 bg-amber-400/5"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="presetId"
                    value={preset.id}
                    checked={isSelected}
                    onChange={() => setSelectedPresetId(preset.id)}
                    className="accent-amber-400"
                  />
                  <span className="font-medium text-zinc-100">
                    {preset.name}
                  </span>
                </div>
                <div className="flex h-5 overflow-hidden rounded border border-zinc-800">
                  <span
                    className="flex-1"
                    style={{ background: preset.palette.bg }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: preset.palette.primary }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: preset.palette.secondary }}
                  />
                  {preset.palette.accent && (
                    <span
                      className="flex-1"
                      style={{ background: preset.palette.accent }}
                    />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {preset.description}
                </p>
              </label>
            );
          })}
        </div>
      </section>

      {/* Playbook intake */}
      {selected.definition.intake.length > 0 && (
        <section className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">
              {selected.name} intake
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Extra context the agents need on top of your product fields.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {selected.definition.intake.map((field) => (
              <IntakeField key={field.id} field={field} />
            ))}
          </div>
        </section>
      )}

      {/* Section toggles (only shown for optional sections) */}
      {selected.definition.sections.some((s) => s.required === false) && (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">
              Optional sections
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Required sections always run. Toggle the optional ones below.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {selected.definition.sections
              .filter((s) => s.required === false)
              .map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700"
                >
                  <input
                    type="checkbox"
                    name="enabled_sections"
                    value={s.id}
                    defaultChecked
                    className="accent-amber-400"
                  />
                  {s.label}
                </label>
              ))}
          </div>
        </section>
      )}

      {/* Fixed section list preview */}
      <section className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-sm font-medium text-zinc-200">
          Sections that will run ({selected.definition.sections.length} agents)
        </h2>
        <ol className="flex flex-wrap gap-1.5 text-xs text-zinc-400">
          {selected.definition.sections.map((s, i) => (
            <li
              key={s.id}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1"
            >
              <span className="text-zinc-500">{i + 1}.</span> {s.label}
            </li>
          ))}
        </ol>
      </section>

      {state.message && !state.ok && (
        <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {selected.definition.sections.length} Claude calls run in parallel.
          Typically 30–60s.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </form>
  );
}

function IntakeField({
  field,
}: {
  field: PlaybookDefinition["intake"][number];
}) {
  const id = `intake_${field.id}`;
  const inputClass =
    "block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">
        {field.label}
        {field.required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
          className={inputClass}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          name={id}
          defaultValue={field.options?.[0] ?? ""}
          required={field.required}
          className={inputClass}
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={id}
          type="text"
          placeholder={field.placeholder}
          required={field.required}
          className={inputClass}
        />
      )}
      {field.hint && <p className="text-xs text-zinc-500">{field.hint}</p>}
    </div>
  );
}
