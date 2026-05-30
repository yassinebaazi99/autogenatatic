"use client";

import { useActionState, useRef } from "react";

import {
  LANDER_PROJECT_SLOT_MIME_CONFIG,
  type LanderProjectSlot,
  type LanderType,
} from "@/lib/lander-project/types";

import {
  type ProjectFileUploadState,
  uploadProjectFileAction,
} from "../actions";

const INITIAL: ProjectFileUploadState = { status: "idle" };

// One uploader per slot. Lives inside the per-type page. Resets the file
// input on success so queueing a second upload is a single click away.
export function ProjectFileSlotUploader({
  landerType,
  slot,
}: {
  landerType: LanderType;
  slot: LanderProjectSlot;
}) {
  const [state, formAction, pending] = useActionState(
    uploadProjectFileAction,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  // Only consider this uploader's own state — the action is shared, so
  // an "ok" from a sibling slot shouldn't reset us.
  const myState =
    (state.status === "ok" || state.status === "error") && state.slot === slot
      ? state
      : { status: "idle" as const };

  if (myState.status === "ok" && formRef.current) {
    formRef.current.reset();
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="landerType" value={landerType} />
      <input type="hidden" name="slot" value={slot} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept={LANDER_PROJECT_SLOT_MIME_CONFIG[slot].accept}
          required
          disabled={pending}
          className="block flex-1 cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:font-medium file:text-zinc-200 hover:border-zinc-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {myState.status === "ok" && (
        <p className="text-[11px] text-emerald-400">{myState.message}</p>
      )}
      {myState.status === "error" && (
        <p className="text-[11px] text-rose-400">{myState.message}</p>
      )}
    </form>
  );
}
