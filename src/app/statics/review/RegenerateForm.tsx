"use client";

import { useState } from "react";

import { regenerateStaticAdAction } from "./actions";

// Inline regenerate form. Starts collapsed as a "Regenerate" button; on
// click it expands to a textarea for the note + a submit row. Submitting
// fires a server action that kicks the single-static rerun via after().
export function RegenerateForm({ staticAdId }: { staticAdId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
      >
        Regenerate
      </button>
    );
  }

  return (
    <form action={regenerateStaticAdAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={staticAdId} />
      <textarea
        name="note"
        rows={2}
        placeholder="Optional: what was wrong with the last one?"
        className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200 focus:border-amber-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Re-run
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
