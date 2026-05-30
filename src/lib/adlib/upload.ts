import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getOrCreateSingletonBrand } from "../brand/singleton";
import { db } from "../db";
import { brandPublicUrl, brandUploadDir, paths } from "../paths";

// Multi-file upload pipeline for reference ads. Each file gets written to
// public/uploads/brand/<brandId>/ads/<safe-name> and a matching AdLibraryRef
// row is created. The analyzer runs separately via after() — this function
// stays synchronous so the user gets a fast response and the refs appear
// in the grid immediately (analysis lands later).

export type UploadAdRefsResult =
  | {
      ok: true;
      created: Array<{ id: string; filename: string }>;
      skipped: Array<{ filename: string; reason: string }>;
    }
  | { ok: false; error: string };

const SUPPORTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_BYTES = 15 * 1024 * 1024;

export async function uploadAdRefs(files: File[]): Promise<UploadAdRefsResult> {
  if (files.length === 0) {
    return { ok: false, error: "No files provided" };
  }

  const brand = await getOrCreateSingletonBrand();
  const dir = path.join(brandUploadDir(brand.id), "ads");
  await mkdir(dir, { recursive: true });

  const created: Array<{ id: string; filename: string }> = [];
  const skipped: Array<{ filename: string; reason: string }> = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      skipped.push({ filename: "(empty)", reason: "empty file" });
      continue;
    }
    if (file.size > MAX_BYTES) {
      skipped.push({
        filename: file.name,
        reason: `too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 15 MB)`,
      });
      continue;
    }

    // Determine mime — prefer the browser's type, fall back to filename.
    const mime = normalizeMime(file);
    if (!mime) {
      skipped.push({
        filename: file.name,
        reason: "unsupported type (use JPG, PNG, or WEBP)",
      });
      continue;
    }

    const safeName = safeFilename(file.name);
    const onDiskName = await pickUniqueName(dir, safeName);
    const absolutePath = path.join(dir, onDiskName);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(absolutePath, buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      skipped.push({ filename: file.name, reason: `write failed: ${message}` });
      continue;
    }

    const url = brandPublicUrl(brand.id, `ads/${onDiskName}`);

    const row = await db.adLibraryRef.create({
      data: {
        brandId: brand.id,
        filename: file.name,
        url,
        mimeType: mime,
        sizeBytes: file.size,
      },
    });
    created.push({ id: row.id, filename: file.name });
  }

  return { ok: true, created, skipped };
}

export async function deleteAdRef(refId: string): Promise<void> {
  const ref = await db.adLibraryRef.findUnique({ where: { id: refId } });
  if (!ref) return;
  const relativeFromPublic = ref.url.replace(/^\//, "");
  const absolutePath = path.join(paths.root, "public", relativeFromPublic);
  await unlink(absolutePath).catch(() => {
    console.warn(`[adlib] missing file on delete: ${absolutePath}`);
  });
  await db.adLibraryRef.delete({ where: { id: refId } });
}

export async function updateAdRefTags(
  refId: string,
  tags: string,
): Promise<void> {
  const normalized = normalizeTags(tags);
  await db.adLibraryRef.update({
    where: { id: refId },
    data: { tags: normalized || null },
  });
}

export async function updateAdRefLabel(
  refId: string,
  label: string,
): Promise<void> {
  const trimmed = label.trim().slice(0, 120);
  await db.adLibraryRef.update({
    where: { id: refId },
    data: { label: trimmed || null },
  });
}

// ---------- helpers ------------------------------------------------------

function normalizeMime(file: File): string | null {
  const declared = file.type;
  if (declared && SUPPORTED_MIMES.has(declared)) return declared;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

function safeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function pickUniqueName(dir: string, desired: string): Promise<string> {
  const { access } = await import("node:fs/promises");
  try {
    await access(path.join(dir, desired));
    const ext = path.extname(desired);
    const base = desired.slice(0, desired.length - ext.length);
    const suffix = Date.now().toString(36).slice(-5);
    return `${base}-${suffix}${ext}`;
  } catch {
    return desired;
  }
}

/** Comma/newline separated → clean comma-separated string. */
export function normalizeTags(raw: string): string {
  return raw
    .split(/[\n,]/g)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .join(", ");
}

export function parseTags(stored: string | null): string[] {
  if (!stored) return [];
  return stored
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
