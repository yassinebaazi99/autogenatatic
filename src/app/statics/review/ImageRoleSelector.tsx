"use client";

import {
  IMAGE_ROLES,
  IMAGE_ROLE_LABELS,
} from "@/lib/static-gen/status";

import { setImageRoleAction } from "./actions";

// Auto-submitting role picker for a generated image. Lives inside a
// form so the server action fires on change; needs a client component
// wrapper because server components can't pass event handlers.
export function ImageRoleSelector({
  staticAdId,
  currentRole,
}: {
  staticAdId: string;
  currentRole: string | null;
}) {
  return (
    <form action={setImageRoleAction}>
      <input type="hidden" name="id" value={staticAdId} />
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Role
      </label>
      <select
        name="role"
        defaultValue={currentRole ?? "_none"}
        onChange={(e) => {
          e.currentTarget.form?.requestSubmit();
        }}
        className="w-full rounded-lg border border-white/8 bg-white/3 px-2 py-1.5 text-xs text-zinc-200 hover:border-white/14 focus:border-amber-500/60 focus:outline-none"
      >
        <option value="_none">— unassigned —</option>
        {IMAGE_ROLES.map((role) => (
          <option key={role} value={role}>
            {IMAGE_ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </form>
  );
}
