"use client";

import { useActionState, useRef } from "react";

import { type UploadState, uploadAdRefsAction } from "./actions";

const INITIAL: UploadState = { status: "idle" };

// Multi-file uploader for reference ads. Lives at the top of /library.
export function AdRefUploader() {
  const [state, formAction, pending] = useActionState(
    uploadAdRefsAction,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  if (state.status === "ok" && formRef.current) {
    formRef.current.reset();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Drop reference ads in
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            JPG, PNG, or WEBP. Each one gets described by Claude vision in
            the background — the analysis is what Phase 3 uses to write the
            Nano Banana prompt.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            name="files"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            required
            disabled={pending}
            className="block max-w-xs cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-200 hover:border-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
      {state.status === "ok" && (
        <p className="mt-3 text-xs text-emerald-400">{state.message}</p>
      )}
      {state.status === "error" && (
        <p className="mt-3 text-xs text-rose-400">{state.message}</p>
      )}
    </form>
  );
}
