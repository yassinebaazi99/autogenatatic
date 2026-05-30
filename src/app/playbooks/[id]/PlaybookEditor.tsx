"use client";

import { useActionState, useMemo, useState } from "react";

import { PlaybookDefinition as PlaybookDefinitionSchema } from "@/lib/playbooks/schemas";
import type { PlaybookDefinition } from "@/lib/playbooks/types";

import { updatePlaybookAction, type UpdatePlaybookState } from "../actions";

const initial: UpdatePlaybookState = { ok: false };

type ParseResult =
  | { ok: true; value: PlaybookDefinition; error?: undefined }
  | { ok: false; value?: undefined; error: string };

function tryParse(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: `JSON syntax error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const result = PlaybookDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "(root)";
    return {
      ok: false,
      error: `${path}: ${first?.message ?? "unknown validation error"}`,
    };
  }
  return { ok: true, value: result.data };
}

export function PlaybookEditor({
  playbookId,
  readOnly,
  initialName,
  initialDescription,
  initialDefinition,
}: {
  playbookId: string;
  readOnly: boolean;
  initialName: string;
  initialDescription: string;
  initialDefinition: string;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [definition, setDefinition] = useState(initialDefinition);
  const [state, formAction, pending] = useActionState(
    updatePlaybookAction,
    initial,
  );

  const parsed = useMemo(() => tryParse(definition), [definition]);

  function handleFormat() {
    const result = tryParse(definition);
    if (result.ok) {
      setDefinition(JSON.stringify(result.value, null, 2));
    }
  }

  const disabled = readOnly || !parsed.ok || pending;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <input type="hidden" name="id" value={playbookId} />
      <input type="hidden" name="definition" value={definition} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <Field
            label="Name"
            value={name}
            onChange={setName}
            name="name"
            readOnly={readOnly}
          />
          <Field
            label="Description"
            value={description}
            onChange={setDescription}
            name="description"
            readOnly={readOnly}
            as="textarea"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-200">
                Definition (JSON)
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Edit sections, presets, stitcher, and copy rules here. Save is
                disabled until the JSON is valid.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFormat}
              disabled={readOnly || !parsed.ok}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Format
            </button>
          </div>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            wrap="off"
            className="block w-full resize-y rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
            style={{ height: "min(70vh, 720px)", overflow: "auto" }}
          />
          {!parsed.ok && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {parsed.error}
            </p>
          )}
          {state.message && (
            <p
              className={`rounded-md border px-3 py-2 text-xs ${
                state.ok
                  ? "border-emerald-800 bg-emerald-950/30 text-emerald-300"
                  : "border-red-900/50 bg-red-950/30 text-red-300"
              }`}
            >
              {state.message}
            </p>
          )}
          {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
            <ul className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-300">
              {Object.entries(state.fieldErrors).map(([path, msg]) => (
                <li key={path}>
                  <code className="text-red-200">{path}</code>: {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        )}
        {readOnly && (
          <p className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
            This is a builtin playbook — it can&apos;t be edited directly. Use
            the <span className="text-zinc-200">Duplicate</span> button above
            to create an editable copy.
          </p>
        )}
      </div>

      <PreviewPanel parsed={parsed} />
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  name,
  readOnly,
  as = "input",
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  readOnly: boolean;
  as?: "input" | "textarea";
  rows?: number;
}) {
  const base =
    "block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40";
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      {as === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          rows={rows}
          className={base}
        />
      ) : (
        <input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={base}
        />
      )}
    </div>
  );
}

function PreviewPanel({ parsed }: { parsed: ParseResult }) {
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Live preview
      </h2>
      {!parsed.ok ? (
        <p className="text-xs text-red-300">
          Waiting for valid JSON: {parsed.error}
        </p>
      ) : (
        <ParsedPreview definition={parsed.value} />
      )}
    </aside>
  );
}

function ParsedPreview({ definition }: { definition: PlaybookDefinition }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-zinc-500">TYPE · STITCHER</div>
        <div className="mt-1 text-sm text-zinc-200">
          {definition.type} · {definition.stitcher.layout} (max-width{" "}
          {definition.stitcher.maxWidth}px)
          {definition.stitcher.dropshipPack && (
            <span className="ml-2 rounded border border-emerald-900 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300">
              dropship pack
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          SECTIONS · {definition.sections.length} agents
        </div>
        <ol className="mt-2 flex flex-col gap-1">
          {definition.sections.map((s, i) => (
            <li
              key={s.id}
              className="flex items-baseline gap-2 text-xs text-zinc-400"
            >
              <span className="font-mono text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-zinc-200">{s.label}</span>
              {s.required === false && (
                <span className="text-[10px] uppercase text-zinc-500">
                  optional
                </span>
              )}
              {s.maxTokens && (
                <span className="text-[10px] text-zinc-600">
                  · {s.maxTokens} tok max
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          INTAKE · {definition.intake.length} fields
        </div>
        {definition.intake.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">no extra questions</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {definition.intake.map((f) => (
              <li key={f.id} className="text-xs text-zinc-400">
                <span className="text-zinc-200">{f.label}</span>{" "}
                <span className="text-zinc-600">
                  ({f.type}
                  {f.required ? ", required" : ""})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="text-xs text-zinc-500">
          PRESETS · {definition.presets.length}
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {definition.presets.map((p) => (
            <li key={p.id}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-200">{p.name}</span>
                <div className="flex h-4 flex-1 overflow-hidden rounded border border-zinc-800">
                  <span
                    className="flex-1"
                    style={{ background: p.palette.bg }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: p.palette.fg }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: p.palette.primary }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: p.palette.secondary }}
                  />
                  {p.palette.accent && (
                    <span
                      className="flex-1"
                      style={{ background: p.palette.accent }}
                    />
                  )}
                </div>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-600">
                {p.fontPair.heading} / {p.fontPair.body} · radius {p.radius} ·{" "}
                {p.density}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="text-xs text-zinc-500">COPY RULES</div>
        <div className="mt-1 text-xs text-zinc-400">
          {definition.copyRules.bannedWords.length} banned words
        </div>
        {definition.copyRules.executionDirective && (
          <p className="mt-1 line-clamp-3 text-xs italic text-zinc-500">
            &ldquo;{definition.copyRules.executionDirective}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
