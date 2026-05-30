import "server-only";

import { db } from "../db";
import { BUILTIN_PLAYBOOKS } from "./builtins";

/**
 * Idempotently inserts the builtin playbooks into the database. If a
 * playbook with the given slug already exists, we UPDATE its definition
 * (so prompt edits in the builtin TS files propagate on next boot). User-
 * duplicated playbooks have different slugs and are never touched.
 *
 * Called from the server component that loads /generate/[id] and /playbooks
 * so the first time either page loads after a new deploy, the seeds exist.
 */
let seedPromise: Promise<void> | null = null;

export async function ensureBuiltinsSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = seedOnce();
  try {
    await seedPromise;
  } catch (err) {
    // On failure, allow a retry next request
    seedPromise = null;
    throw err;
  }
}

async function seedOnce(): Promise<void> {
  for (const builtin of BUILTIN_PLAYBOOKS) {
    const existing = await db.playbook.findUnique({
      where: { slug: builtin.slug },
    });

    const definition = JSON.stringify(builtin);

    if (existing) {
      // Keep the id stable so existing LandingPages keep their FK.
      // Always refresh name/description/definition from the source of truth.
      await db.playbook.update({
        where: { id: existing.id },
        data: {
          name: builtin.name,
          type: builtin.type,
          description: builtin.description,
          definition,
          isBuiltin: true,
        },
      });
    } else {
      await db.playbook.create({
        data: {
          slug: builtin.slug,
          name: builtin.name,
          type: builtin.type,
          description: builtin.description,
          definition,
          isBuiltin: true,
        },
      });
    }
  }
}
