"use client";

import { useState } from "react";

import { updateAdRefAnalysisAction } from "../actions";

// Manual override for an AdLibraryRef's Claude vision analysis. Shows
// the current text as a formatted block by default; an "Edit" button
// flips it to a textarea the user can rewrite directly.
export function AnalysisEditor({
  refId,
  analysis,
}: {
  refId: string;
  analysis: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {analysis}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Edit manually
        </button>
      </>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateAdRefAnalysisAction(fd);
        setOpen(false);
      }}
      className="mt-3"
    >
      <input type="hidden" name="id" value={refId} />
      <textarea
        name="analysis"
        defaultValue={analysis}
        rows={10}
        className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs leading-relaxed text-zinc-200 focus:border-amber-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-amber-500 px-3 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Save analysis
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
