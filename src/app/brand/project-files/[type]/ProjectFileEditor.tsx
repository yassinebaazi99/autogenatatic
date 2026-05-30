"use client";

import { useState } from "react";

import { updateProjectFileContentAction } from "../actions";

// Inline "Edit" for a LanderProjectFile. Only doc-kind files show it —
// image files (visualInspo with an .png/.jpg) have `content: null` and
// can only be replaced via upload + delete.
export function ProjectFileEditor({
  id,
  landerType,
  content,
}: {
  id: string;
  landerType: string;
  content: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/6 px-3 py-1 text-[11px] text-zinc-500 hover:border-white/14 hover:text-zinc-200"
      >
        Edit
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateProjectFileContentAction(fd);
        setOpen(false);
      }}
      className="mt-3 w-full rounded-xl border border-amber-500/20 bg-amber-500/4 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="landerType" value={landerType} />
      <div className="flex items-center justify-between gap-3">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          Edit extracted text
        </label>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
      <textarea
        name="content"
        defaultValue={content}
        rows={14}
        className="mt-3 w-full resize-y rounded-lg border border-white/8 bg-white/3 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-100 focus:border-amber-500/60 focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Save
        </button>
        <p className="text-[10px] text-zinc-500">
          The new text is what the runner injects on the next generation.
        </p>
      </div>
    </form>
  );
}
