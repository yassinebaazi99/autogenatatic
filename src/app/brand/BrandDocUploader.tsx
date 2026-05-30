"use client";

import { useActionState, useRef } from "react";

import {
  BRAND_DOC_CATEGORIES,
  BRAND_DOC_CATEGORY_HINTS,
  BRAND_DOC_CATEGORY_LABELS,
  type BrandDocCategory,
} from "@/lib/brand/categories";

import { type UploadState, uploadBrandDocAction } from "./actions";

const INITIAL: UploadState = { status: "idle" };

// Upload form with inline live state. The file input is reset on success
// so the user can queue another upload without clicking away.
export function BrandDocUploader() {
  const [state, formAction, pending] = useActionState(
    uploadBrandDocAction,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  // Reset the file input after a successful upload so dropping another
  // file feels natural. Run after render via ref, not useEffect — the
  // server action already triggered revalidation.
  if (state.status === "ok" && formRef.current) {
    formRef.current.reset();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
    >
      <h3 className="text-sm font-semibold text-zinc-100">Add a document</h3>
      <p className="mt-1 text-xs text-zinc-500">
        PDF, DOCX, or TXT. The text is extracted and fed to every agent
        prompt — picking the right category helps the agents weight it
        correctly.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
            File
          </label>
          <input
            type="file"
            name="file"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            required
            disabled={pending}
            className="mt-1 block w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-200 hover:border-zinc-600 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
            Category
          </label>
          <select
            name="category"
            defaultValue={"brand" satisfies BrandDocCategory}
            disabled={pending}
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50"
          >
            {BRAND_DOC_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {BRAND_DOC_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-300">
          What goes in each category?
        </summary>
        <ul className="mt-2 space-y-1">
          {BRAND_DOC_CATEGORIES.map((cat) => (
            <li key={cat}>
              <span className="font-medium text-zinc-400">
                {BRAND_DOC_CATEGORY_LABELS[cat]}
              </span>
              : {BRAND_DOC_CATEGORY_HINTS[cat]}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload document"}
        </button>
        {state.status === "ok" && (
          <span className="text-xs text-emerald-400">{state.message}</span>
        )}
        {state.status === "error" && (
          <span className="text-xs text-rose-400">{state.message}</span>
        )}
      </div>
    </form>
  );
}
