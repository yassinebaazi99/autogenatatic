"use client";

import { useState } from "react";

import {
  BRAND_DOC_CATEGORIES,
  BRAND_DOC_CATEGORY_LABELS,
  type BrandDocCategory,
} from "@/lib/brand/categories";

import { updateBrandDocAction } from "./actions";

// Inline edit form for a BrandDoc row. Collapsed "Edit" button by
// default; on click expands to a textarea with the extracted content
// and a category select.
export function BrandDocEditor({
  id,
  category,
  extracted,
}: {
  id: string;
  category: BrandDocCategory;
  extracted: string;
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
        await updateBrandDocAction(fd);
        setOpen(false);
      }}
      className="mt-3 w-full rounded-xl border border-amber-500/20 bg-amber-500/4 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center justify-between gap-3">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-amber-300">
          Edit doc
        </label>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Category
          </label>
          <select
            name="category"
            defaultValue={category}
            className="mt-1 w-full rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          >
            {BRAND_DOC_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {BRAND_DOC_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Extracted text (what every agent sees)
          </label>
          <textarea
            name="extracted"
            defaultValue={extracted}
            rows={12}
            className="mt-1 w-full resize-y rounded-lg border border-white/8 bg-white/3 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-100 focus:border-amber-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Save changes
        </button>
        <p className="text-[10px] text-zinc-500">
          Changes apply on the next generation — no regen needed.
        </p>
      </div>
    </form>
  );
}
