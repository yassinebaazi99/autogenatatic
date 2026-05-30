"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { PlaybookDefinition as PlaybookDefinitionSchema } from "@/lib/playbooks/schemas";
import type { PlaybookDefinition } from "@/lib/playbooks/types";
import { slugify } from "@/lib/slug";

export type UpdatePlaybookState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Updates a user-owned playbook. Builtin playbooks are read-only — this
 * action refuses to touch them. The editor UI enforces this too, but we
 * re-check here so a crafted POST can't edit a builtin.
 */
export async function updatePlaybookAction(
  _prev: UpdatePlaybookState,
  formData: FormData,
): Promise<UpdatePlaybookState> {
  const id = formData.get("id");
  const name = formData.get("name");
  const description = formData.get("description");
  const definitionJson = formData.get("definition");

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof definitionJson !== "string"
  ) {
    return { ok: false, message: "Missing fields." };
  }

  const existing = await db.playbook.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Playbook not found." };
  if (existing.isBuiltin) {
    return {
      ok: false,
      message:
        "Builtin playbooks are read-only. Duplicate it first to edit.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(definitionJson);
  } catch (err) {
    return {
      ok: false,
      message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Inject slug + name + description + type from the form fields so those
  // row-level values override whatever is in the textarea.
  const merged = {
    ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    slug: existing.slug,
    name: name.trim() || existing.name,
    description: description.trim(),
    type: existing.type,
  };

  const result = PlaybookDefinitionSchema.safeParse(merged);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      message: "Playbook definition failed validation.",
      fieldErrors,
    };
  }

  await db.playbook.update({
    where: { id },
    data: {
      name: result.data.name,
      description: result.data.description,
      definition: JSON.stringify(result.data, null, 2),
    },
  });

  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${id}`);
  return { ok: true, message: "Saved." };
}

/**
 * Creates a user-owned copy of any playbook (builtin or not). Redirects to
 * the editor for the new row.
 */
export async function duplicatePlaybookAction(formData: FormData) {
  const sourceId = formData.get("id");
  if (typeof sourceId !== "string" || !sourceId) return;

  const source = await db.playbook.findUnique({ where: { id: sourceId } });
  if (!source) return;

  const suffix = randomBytes(3).toString("hex");
  const newSlug = `${source.slug}-copy-${suffix}`;
  const newName = `${source.name} (copy)`;

  // Parse the definition so we can overwrite slug/name/description cleanly
  // and re-serialize with consistent formatting.
  let parsed: PlaybookDefinition;
  try {
    parsed = PlaybookDefinitionSchema.parse(JSON.parse(source.definition));
  } catch {
    return;
  }
  parsed.slug = newSlug;
  parsed.name = newName;
  // Keep the duplicated playbook's type aligned with its source, downgrading
  // generic→custom so the builtin doesn't accidentally get cloned in place.
  parsed.type =
    source.type === "generic"
      ? "custom"
      : (source.type as PlaybookDefinition["type"]);

  const created = await db.playbook.create({
    data: {
      slug: newSlug,
      name: newName,
      type: parsed.type,
      description: source.description,
      isBuiltin: false,
      definition: JSON.stringify(parsed, null, 2),
    },
  });

  revalidatePath("/playbooks");
  redirect(`/playbooks/${created.id}`);
}

/**
 * Creates a fresh blank user-owned playbook from a minimal template.
 */
export async function createBlankPlaybookAction() {
  const suffix = randomBytes(3).toString("hex");
  const slug = `custom-playbook-${suffix}`;
  const template: PlaybookDefinition = {
    slug,
    name: "Untitled playbook",
    type: "custom",
    description: "A new custom playbook — edit the JSON to shape it.",
    intake: [],
    sections: [
      {
        id: "hero",
        label: "Hero",
        systemPrompt:
          "You are the hero-section agent. Output a single self-contained <section> block using inline-friendly HTML. No commentary, no code fences.",
        directive:
          "Write a one-sentence headline and a one-sentence subhead grounded in the product description. Output <section class=\"lf-hero\"><h1>…</h1><p>…</p></section>.",
      },
    ],
    presets: [
      {
        id: "default",
        name: "Default",
        description: "A neutral starting point.",
        palette: {
          bg: "#ffffff",
          fg: "#111111",
          primary: "#2563eb",
          secondary: "#64748b",
        },
        fontPair: { heading: "system-ui", body: "system-ui" },
        radius: "sm",
        density: "normal",
      },
    ],
    stitcher: {
      layout: "inline-css-narrow",
      maxWidth: 720,
      dropshipPack: false,
    },
    copyRules: {
      bannedWords: [],
      styleGuide: "",
      executionDirective: "",
    },
    imageGen: [],
  };

  const created = await db.playbook.create({
    data: {
      slug,
      name: template.name,
      type: template.type,
      description: template.description,
      isBuiltin: false,
      definition: JSON.stringify(template, null, 2),
    },
  });

  revalidatePath("/playbooks");
  redirect(`/playbooks/${created.id}`);
}

/**
 * Deletes a user-owned playbook. Builtins cannot be deleted (they'd just
 * get re-seeded on next boot anyway).
 */
export async function deletePlaybookAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const existing = await db.playbook.findUnique({ where: { id } });
  if (!existing || existing.isBuiltin) return;

  await db.playbook.delete({ where: { id } });
  revalidatePath("/playbooks");
  redirect("/playbooks");
}

// Unused import guard — keep the slug helper importable for future uses.
void slugify;
