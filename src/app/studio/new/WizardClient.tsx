"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import type { LanderType } from "@/lib/lander-project/types";

import {
  type NewLanderState,
  submitNewLanderAction,
} from "../../landers/new/actions";

// The wizard is a 5-step state machine that walks the user from empty
// slate to a fully-generated lander. Each step accepts free-text "extra
// instructions" that flow into the generation as wizard notes. Reuses
// submitNewLanderAction from /landers/new — the wizard is a UX layer
// on top of the same server action.
//
// Steps:
//   1. Lander type        → card picker + "overall direction" note
//   2. Design preset      → palette swatches + "style notes" textarea
//   3. Visual anchors     → multi-select from ready images + "image usage" note
//   4. Details            → title + intake + section selection + "details" note
//   5. Review & generate  → summary, warnings, "final instruction" note, Generate

type TemplateSummary = {
  type: LanderType;
  label: string;
  blurb: string;
  sectionCount: number;
  presets: Array<{
    id: string;
    name: string;
    description: string;
    palette: {
      bg: string;
      fg: string;
      primary: string;
      accent: string;
    };
    fontHeading: string;
  }>;
  intake: Array<{
    id: string;
    label: string;
    placeholder: string;
    hint: string;
    required: boolean;
    type: "text" | "textarea" | "select";
    options: string[];
  }>;
  sections: Array<{
    id: string;
    label: string;
    required: boolean;
  }>;
};

type StaticSummary = {
  id: string;
  url: string;
  role: string | null;
  roleLabel: string | null;
  promptSnippet: string;
};

type BrandSnapshot = {
  name: string;
  description: string | null;
  docCount: number;
  adRefCount: number;
};

type Props = {
  brand: BrandSnapshot;
  projectFileCounts: Record<LanderType, number>;
  templates: TemplateSummary[];
  statics: StaticSummary[];
};

const STEPS = [
  { key: 1, label: "Type", hint: "What kind of page" },
  { key: 2, label: "Style", hint: "Palette & feel" },
  { key: 3, label: "Images", hint: "Visual anchors" },
  { key: 4, label: "Details", hint: "Title, intake, sections" },
  { key: 5, label: "Review", hint: "Fire it off" },
] as const;

const INITIAL: NewLanderState = { status: "idle" };

// Placeholder prompts that hint at what's useful to write at each step.
const NOTE_PLACEHOLDERS: Record<
  "type" | "style" | "anchors" | "details" | "final",
  string
> = {
  type: "e.g. this should feel like a VICE health investigation, not a hype ad. Lean skeptical, not salesy.",
  style: "e.g. push the palette darker than the preset, bigger headlines, tighter line-height.",
  anchors:
    "e.g. use the sunrise kitchen shot as the hero; product shots go in the ingredient cards; keep the testimonial shot for the proof section.",
  details:
    "e.g. emphasize the 60-day guarantee in the pricing and final CTA. Never mention the Amazon listing.",
  final:
    "e.g. must include the Delaware LLC disclosure in the footer. FDA disclaimer language at the bottom of the guarantee.",
};

export function WizardClient({
  brand,
  projectFileCounts,
  templates,
  statics,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // --- Core selections --------------------------------------------------

  const initialType = (templates[0]?.type ?? "advertorial") as LanderType;
  const initialTemplate = templates.find((t) => t.type === initialType);

  const [selectedType, setSelectedType] = useState<LanderType>(initialType);
  const activeTemplate = useMemo(
    () => templates.find((t) => t.type === selectedType) ?? templates[0],
    [templates, selectedType],
  );

  const [presetId, setPresetId] = useState<string>(
    initialTemplate?.presets[0]?.id ?? "",
  );

  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    () => new Set((initialTemplate?.sections ?? []).map((s) => s.id)),
  );

  // Resetting dependent state through an explicit click handler instead
  // of a derived-state guard. React 19's concurrent scheduler was
  // swallowing the prior `if (lastType !== selectedType)` during-render
  // setters under some interleavings, which made clicking Listicle/Quiz
  // silently fail. Direct event-driven updates avoid the hazard.
  const selectType = (type: LanderType) => {
    if (type === selectedType) return;
    setSelectedType(type);
    const next = templates.find((t) => t.type === type);
    setPresetId(next?.presets[0]?.id ?? "");
    setEnabledSections(new Set((next?.sections ?? []).map((s) => s.id)));
  };

  const [selectedStatics, setSelectedStatics] = useState<Set<string>>(new Set());
  const toggleStatic = (id: string) =>
    setSelectedStatics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSection = (id: string) =>
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [title, setTitle] = useState("");
  const [intakeValues, setIntakeValues] = useState<Record<string, string>>({});
  const [headlineOverride, setHeadlineOverride] = useState("");

  // --- Per-step notes ---------------------------------------------------

  const [notes, setNotes] = useState({
    type: "",
    style: "",
    anchors: "",
    details: "",
    final: "",
  });
  const updateNote = (
    key: keyof typeof notes,
    value: string,
  ) => setNotes((prev) => ({ ...prev, [key]: value }));

  // --- Action -----------------------------------------------------------

  const [state, formAction, pending] = useActionState(
    submitNewLanderAction,
    INITIAL,
  );

  const canProceed = (() => {
    if (step === 1) return !!selectedType;
    if (step === 2) return !!presetId;
    if (step === 3) return true;
    if (step === 4) return title.trim().length > 0 && enabledSections.size > 0;
    return true;
  })();

  const activePreset = activeTemplate?.presets.find((p) => p.id === presetId);
  const noteCount = Object.values(notes).filter((v) => v.trim().length > 0).length;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
          Lander studio
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50">
          Build a funnel, step by step
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Every step is dynamic — pick your choices, then drop an optional
          note so the agents know exactly what you want at that layer.
          Notes land in the section prompts at the right priority level.
        </p>
      </header>

      {/* Progress rail */}
      <ol className="grid grid-cols-5 gap-3">
        {STEPS.map((s) => {
          const isActive = s.key === step;
          const isDone = s.key < step;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => {
                  if (s.key < step) setStep(s.key as 1 | 2 | 3 | 4 | 5);
                }}
                disabled={s.key > step}
                className={
                  "nv-card-hover w-full rounded-xl border px-4 py-3 text-left " +
                  (isActive
                    ? "border-amber-500/50 bg-linear-to-br from-amber-500/10 to-amber-500/2 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                    : isDone
                      ? "border-emerald-500/30 bg-emerald-500/4"
                      : "border-white/6 bg-white/2")
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " +
                      (isActive
                        ? "bg-amber-500 text-zinc-950"
                        : isDone
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-white/6 text-zinc-500")
                    }
                  >
                    {isDone ? "✓" : s.key}
                  </span>
                  <span
                    className={
                      "text-sm font-semibold " +
                      (isActive ? "text-zinc-50" : "text-zinc-400")
                    }
                  >
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 pl-8 text-[10px] text-zinc-500">{s.hint}</p>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step body */}
      <div className="min-h-90 rounded-2xl border border-white/6 bg-white/2 p-7 backdrop-blur-xl">
        {step === 1 && (
          <>
            <StepType
              templates={templates}
              selected={selectedType}
              onPick={selectType}
            />
            <StepNote
              value={notes.type}
              onChange={(v) => updateNote("type", v)}
              label="Overall direction (optional)"
              placeholder={NOTE_PLACEHOLDERS.type}
              hint="Lands in every section's system prompt as your overarching direction. Strongest signal a note gives."
            />
          </>
        )}
        {step === 2 && activeTemplate && (
          <>
            <StepStyle
              template={activeTemplate}
              presetId={presetId}
              onPick={setPresetId}
            />
            <StepNote
              value={notes.style}
              onChange={(v) => updateNote("style", v)}
              label="Style notes (optional)"
              placeholder={NOTE_PLACEHOLDERS.style}
              hint="Fine-tune the preset. Mentioned near the lander-type block in each section's user prompt."
            />
          </>
        )}
        {step === 3 && (
          <>
            <StepAnchors
              statics={statics}
              selected={selectedStatics}
              toggle={toggleStatic}
              clear={() => setSelectedStatics(new Set())}
            />
            <StepNote
              value={notes.anchors}
              onChange={(v) => updateNote("anchors", v)}
              label="Image usage (optional)"
              placeholder={NOTE_PLACEHOLDERS.anchors}
              hint="Tell agents which image belongs where. Most effective when images have roles tagged on the review page."
            />
          </>
        )}
        {step === 4 && activeTemplate && (
          <>
            <StepDetails
              template={activeTemplate}
              title={title}
              setTitle={setTitle}
              headlineOverride={headlineOverride}
              setHeadlineOverride={setHeadlineOverride}
              intake={intakeValues}
              setIntake={(id, value) =>
                setIntakeValues((prev) => ({ ...prev, [id]: value }))
              }
              enabledSections={enabledSections}
              toggleSection={toggleSection}
            />
            <StepNote
              value={notes.details}
              onChange={(v) => updateNote("details", v)}
              label="Detail notes (optional)"
              placeholder={NOTE_PLACEHOLDERS.details}
              hint="Any per-section must-haves or must-avoids that don't fit in the structured intake."
            />
          </>
        )}
        {step === 5 && activeTemplate && (
          <>
            <StepReview
              brand={brand}
              projectFileCounts={projectFileCounts}
              template={activeTemplate}
              preset={activePreset}
              staticCount={selectedStatics.size}
              enabledSections={enabledSections}
              title={title}
              headlineOverride={headlineOverride}
              intake={intakeValues}
              notes={notes}
            />
            <StepNote
              value={notes.final}
              onChange={(v) => updateNote("final", v)}
              label="Final instruction (optional)"
              placeholder={NOTE_PLACEHOLDERS.final}
              hint="Last word before generation. Injected as a hard constraint at the top of every section's system prompt."
            />
          </>
        )}
      </div>

      {/* Footer controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))
          }
          disabled={step === 1}
          className="rounded-lg border border-white/8 bg-white/2 px-4 py-2 text-sm text-zinc-400 hover:border-white/15 hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {noteCount > 0 && (
            <span className="text-[11px] text-zinc-500">
              {noteCount} {noteCount === 1 ? "note" : "notes"} will be sent
            </span>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => ((s + 1) as 2 | 3 | 4 | 5))}
              disabled={!canProceed}
              className="nv-cta rounded-lg px-6 py-2.5 text-sm disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="landerType" value={selectedType} />
              <input type="hidden" name="presetId" value={presetId} />
              <input type="hidden" name="title" value={title} />
              <input
                type="hidden"
                name="headlineOverride"
                value={headlineOverride}
              />
              <input
                type="hidden"
                name="staticAdIds"
                value={Array.from(selectedStatics).join(",")}
              />
              <input
                type="hidden"
                name="enabledSectionIds"
                value={Array.from(enabledSections).join(",")}
              />
              {activeTemplate?.intake.map((f) => (
                <input
                  key={f.id}
                  type="hidden"
                  name={`intake_${f.id}`}
                  value={intakeValues[f.id] ?? ""}
                />
              ))}
              <input type="hidden" name="note_type" value={notes.type} />
              <input type="hidden" name="note_style" value={notes.style} />
              <input type="hidden" name="note_anchors" value={notes.anchors} />
              <input type="hidden" name="note_details" value={notes.details} />
              <input type="hidden" name="note_final" value={notes.final} />
              <button
                type="submit"
                disabled={pending}
                className="nv-cta rounded-lg px-7 py-2.5 text-sm"
              >
                {pending ? "Queuing lander…" : "✦ Generate lander"}
              </button>
            </form>
          )}
        </div>
      </div>

      {state.status === "error" && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/6 px-4 py-2 text-xs text-rose-300">
          {state.message}
        </p>
      )}
    </div>
  );
}

// ---------- reusable per-step note textarea ----------------------------

function StepNote({
  value,
  onChange,
  label,
  placeholder,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  hint: string;
}) {
  const [open, setOpen] = useState(value.length > 0);

  if (!open) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-white/8 bg-white/1.5 p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-sm text-amber-300">
            +
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-200">{label}</p>
            <p className="text-[11px] text-zinc-500">
              Click to add free-text guidance for this step.
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/4 p-5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          {label}
        </label>
        {value.length === 0 && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Collapse
          </button>
        )}
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
      />
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </div>
  );
}

// ---------- step components --------------------------------------------

function StepType({
  templates,
  selected,
  onPick,
}: {
  templates: TemplateSummary[];
  selected: LanderType;
  onPick: (t: LanderType) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-zinc-50">
          What are we building?
        </h2>
        <p className="text-sm text-zinc-500">
          Each lander type has its own section structure, copy patterns, and
          project files workspace.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((t) => {
          const active = selected === t.type;
          return (
            <button
              type="button"
              key={t.type}
              onClick={() => onPick(t.type)}
              className={
                "nv-card-hover flex flex-col rounded-2xl border p-6 text-left " +
                (active
                  ? "border-amber-500/60 bg-linear-to-br from-amber-500/10 to-amber-500/2 shadow-[0_0_30px_-10px_rgba(245,158,11,0.35)]"
                  : "border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4")
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl">
                  {t.type === "advertorial"
                    ? "📰"
                    : t.type === "listicle"
                      ? "🏆"
                      : "❓"}
                </span>
                {active && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-zinc-950">
                    ✓
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-zinc-50">{t.label}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500">
                {t.blurb}
              </p>
              <p className="mt-4 text-[10px] uppercase tracking-widest text-zinc-600">
                {t.sectionCount} sections
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepStyle({
  template,
  presetId,
  onPick,
}: {
  template: TemplateSummary;
  presetId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-zinc-50">Design preset</h2>
        <p className="text-sm text-zinc-500">
          Picks the palette, fonts, and density. Swatches show the actual
          colors the stitcher applies.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {template.presets.map((p) => {
          const active = presetId === p.id;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onPick(p.id)}
              className={
                "nv-card-hover overflow-hidden rounded-2xl border text-left " +
                (active
                  ? "border-amber-500/60 bg-linear-to-br from-amber-500/10 to-amber-500/2"
                  : "border-white/6 bg-white/2 hover:border-white/12")
              }
            >
              <div className="flex h-16 overflow-hidden">
                <div
                  className="flex-1"
                  style={{ backgroundColor: p.palette.bg }}
                />
                <div
                  className="flex-1"
                  style={{ backgroundColor: p.palette.fg }}
                />
                <div
                  className="flex-1"
                  style={{ backgroundColor: p.palette.primary }}
                />
                <div
                  className="flex-1"
                  style={{ backgroundColor: p.palette.accent }}
                />
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: `${p.fontHeading}, serif` }}
                  >
                    <span className="text-zinc-50">{p.name}</span>
                  </h3>
                  {active && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-zinc-950">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {p.description}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
                  Heading: {p.fontHeading}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepAnchors({
  statics,
  selected,
  toggle,
  clear,
}: {
  statics: StaticSummary[];
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
}) {
  const untaggedCount = statics.filter((s) => !s.role).length;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-50">
            Pick page imagery
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            These are the images the lander will embed. Each one gets
            injected as an actual <code>&lt;img&gt;</code> URL the agents
            can drop into sections. Tag them with a role on the{" "}
            <Link
              href="/statics/review"
              className="text-amber-400 underline-offset-2 hover:underline"
            >
              review page
            </Link>{" "}
            so the runner picks the right one for each slot.
          </p>
        </div>
        {statics.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{selected.size} selected</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={clear}
                className="rounded-md border border-white/8 px-2 py-1 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </header>

      {untaggedCount > 0 && statics.length > 0 && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/4 px-3 py-2 text-[11px] text-amber-300">
          ⚠ {untaggedCount} of {statics.length} ready images don't have a
          role tag yet. The runner still uses them, but agents won't know
          which section to drop them in.
        </p>
      )}

      {statics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/4 p-10 text-center">
          <p className="text-sm text-amber-200">
            No ready images in your brand yet.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            You can still generate a lander — the agents will fall back to
            the project files for visual cues. Or{" "}
            <Link
              href="/statics/new"
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300"
            >
              generate some first ↗
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {statics.map((s) => {
            const isSelected = selected.has(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggle(s.id)}
                title={s.promptSnippet}
                className={
                  "nv-card-hover relative overflow-hidden rounded-xl border " +
                  (isSelected
                    ? "border-amber-500/80 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]"
                    : "border-white/6 hover:border-white/18")
                }
              >
                <div className="relative aspect-square bg-zinc-950">
                  {s.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={s.url}
                      alt="image"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                      no image
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-linear-to-t from-amber-500/30 to-transparent" />
                  )}
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-zinc-950 shadow-lg">
                      ✓
                    </span>
                  )}
                  {s.roleLabel && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-sky-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-sky-200 ring-1 ring-sky-500/40">
                      {s.roleLabel}
                    </span>
                  )}
                  {!s.role && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-zinc-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                      untagged
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepDetails({
  template,
  title,
  setTitle,
  headlineOverride,
  setHeadlineOverride,
  intake,
  setIntake,
  enabledSections,
  toggleSection,
}: {
  template: TemplateSummary;
  title: string;
  setTitle: (v: string) => void;
  headlineOverride: string;
  setHeadlineOverride: (v: string) => void;
  intake: Record<string, string>;
  setIntake: (id: string, value: string) => void;
  enabledSections: Set<string>;
  toggleSection: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-zinc-50">Fill in details</h2>
        <p className="text-sm text-zinc-500">
          Title is required. Intake fields are type-specific. Uncheck
          sections you don't want generated — the runner will skip them.
        </p>
      </header>

      <div className="space-y-5">
        <Field
          label="Title"
          required
          hint="Used for the URL slug and the page title."
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Acme Kettle — Winter Launch"
            className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
          />
        </Field>

        <Field
          label="Exact headline override"
          hint="Optional. If set, the headline agent uses this verbatim — no paraphrasing — and writes the eyebrow, subhead, and supporting copy around it. Leave blank to let the agent write the headline from scratch."
        >
          <input
            value={headlineOverride}
            onChange={(e) => setHeadlineOverride(e.target.value)}
            placeholder="e.g. 47,382 women switched to this kettle in 6 weeks — here's why"
            className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
          />
        </Field>

        {template.intake.length > 0 && (
          <div className="rounded-xl border border-white/6 bg-white/1.5 p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {template.label} intake
            </p>
            <div className="space-y-4">
              {template.intake.map((field) => (
                <Field
                  key={field.id}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                >
                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={intake[field.id] ?? ""}
                      onChange={(e) => setIntake(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full resize-y rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={intake[field.id] ?? ""}
                      onChange={(e) => setIntake(field.id, e.target.value)}
                      className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
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
                      value={intake[field.id] ?? ""}
                      onChange={(e) => setIntake(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/6 bg-white/1.5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Sections to generate
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Uncheck anything you don't want this lander to include.{" "}
                {enabledSections.size} of {template.sections.length} selected.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {template.sections.map((s) => {
              const on = enabledSections.has(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    if (s.required && on) return; // required sections can't be unchecked
                    toggleSection(s.id);
                  }}
                  className={
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors " +
                    (on
                      ? "border-emerald-500/30 bg-emerald-500/5 text-zinc-100"
                      : "border-white/6 bg-white/2 text-zinc-500 hover:border-white/12")
                  }
                >
                  <span
                    className={
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                      (on
                        ? "border-emerald-500 bg-emerald-500 text-[10px] font-bold text-zinc-950"
                        : "border-white/15 bg-transparent")
                    }
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.required && (
                    <span className="text-[9px] uppercase tracking-wider text-amber-400">
                      req
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview({
  brand,
  projectFileCounts,
  template,
  preset,
  staticCount,
  enabledSections,
  title,
  headlineOverride,
  intake,
  notes,
}: {
  brand: BrandSnapshot;
  projectFileCounts: Record<LanderType, number>;
  template: TemplateSummary;
  preset:
    | { id: string; name: string; description: string }
    | undefined;
  staticCount: number;
  enabledSections: Set<string>;
  title: string;
  headlineOverride: string;
  intake: Record<string, string>;
  notes: {
    type: string;
    style: string;
    anchors: string;
    details: string;
    final: string;
  };
}) {
  const pfCount = projectFileCounts[template.type] ?? 0;
  const intakeFilled = Object.values(intake).filter(
    (v) => v.trim().length > 0,
  ).length;
  const filledNotes = Object.entries(notes).filter(([, v]) => v.trim().length > 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-zinc-50">
          Ready to generate
        </h2>
        <p className="text-sm text-zinc-500">
          Review your choices and the context agents will see. Warnings are
          non-blocking.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard label="Lander">
          <p className="text-lg font-semibold text-zinc-50">{title || "—"}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {template.label} · {preset?.name ?? "no preset"} ·{" "}
            {enabledSections.size}/{template.sections.length} sections
          </p>
        </SummaryCard>

        <SummaryCard label="Images">
          <p className="text-lg font-semibold text-zinc-50">
            {staticCount} {staticCount === 1 ? "image" : "images"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {staticCount > 0
              ? "will be embedded by role"
              : "none — agents skip image sections or use placeholders"}
          </p>
        </SummaryCard>

        <SummaryCard label="Brand knowledge">
          <p className="text-lg font-semibold text-zinc-50">
            {brand.docCount} {brand.docCount === 1 ? "doc" : "docs"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {brand.name} · {brand.adRefCount} refs
          </p>
        </SummaryCard>

        <SummaryCard label={`${template.label} project files`}>
          <p className="text-lg font-semibold text-zinc-50">
            {pfCount} {pfCount === 1 ? "file" : "files"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {pfCount > 0
              ? "injected into every section"
              : "none — agents use defaults"}
          </p>
        </SummaryCard>
      </div>

      {(brand.docCount === 0 || pfCount === 0) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/4 p-4">
          <p className="text-xs font-semibold text-amber-300">
            ⚠ Context gaps
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-zinc-400">
            {brand.docCount === 0 && (
              <li>
                • No brand docs yet.{" "}
                <Link
                  href="/brand"
                  className="text-amber-400 underline-offset-2 hover:underline"
                >
                  Upload some
                </Link>{" "}
                for a more grounded lander.
              </li>
            )}
            {pfCount === 0 && (
              <li>
                • No {template.label} project files.{" "}
                <Link
                  href={`/brand/project-files/${template.type}`}
                  className="text-amber-400 underline-offset-2 hover:underline"
                >
                  Add copy guidelines or visual inspo
                </Link>{" "}
                to get closer to your house style.
              </li>
            )}
          </ul>
          <p className="mt-2 text-[10px] text-zinc-600">
            You can still generate — these are recommendations, not
            requirements.
          </p>
        </div>
      )}

      {headlineOverride.trim().length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/4 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
            Pinned headline
          </p>
          <p className="mt-2 text-sm text-zinc-100">"{headlineOverride}"</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            The headline agent will use this verbatim.
          </p>
        </div>
      )}

      {intakeFilled > 0 && (
        <div className="rounded-xl border border-white/6 bg-white/1.5 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Intake answers ({intakeFilled})
          </p>
          <ul className="mt-3 space-y-2 text-xs text-zinc-300">
            {Object.entries(intake)
              .filter(([, v]) => v.trim().length > 0)
              .map(([k, v]) => {
                const field = template.intake.find((f) => f.id === k);
                return (
                  <li key={k}>
                    <span className="text-zinc-500">
                      {field?.label ?? k}:
                    </span>{" "}
                    {v}
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {filledNotes.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/4 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
            Your wizard notes ({filledNotes.length})
          </p>
          <ul className="mt-3 space-y-3 text-xs">
            {filledNotes.map(([key, value]) => (
              <li key={key}>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {labelForNoteKey(key)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-zinc-200">
                  {value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function labelForNoteKey(key: string): string {
  switch (key) {
    case "type":
      return "Overall direction (Step 1)";
    case "style":
      return "Style notes (Step 2)";
    case "anchors":
      return "Image usage (Step 3)";
    case "details":
      return "Detail notes (Step 4)";
    case "final":
      return "Final instruction (Step 5)";
    default:
      return key;
  }
}

function SummaryCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}
