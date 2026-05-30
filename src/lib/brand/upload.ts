import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../db";
import { brandUploadDir, paths } from "../paths";
import type { BrandDocCategory } from "./categories";
import {
  ExtractableMime,
  extractTextFromBuffer,
  guessMimeFromFilename,
  isExtractableMime,
} from "./extract";
import { getOrCreateSingletonBrand } from "./singleton";

// Writes the file to public/uploads/brand/<brandId>/<safe-name> on disk,
// extracts plain text, and records a BrandDoc row. Duplicate filenames are
// de-duped by appending a short timestamp suffix so nothing silently
// overwrites an existing doc.

export type UploadBrandDocInput = {
  file: File;
  category: BrandDocCategory;
};

export type UploadBrandDocResult =
  | { ok: true; id: string; filename: string; chars: number }
  | { ok: false; error: string };

export async function uploadBrandDoc(
  input: UploadBrandDocInput,
): Promise<UploadBrandDocResult> {
  const { file, category } = input;

  if (!file || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "File is too large (25 MB max)" };
  }

  // Determine mime — prefer the browser's type, fall back to filename.
  const rawMime = file.type || "";
  const mime: ExtractableMime | null = isExtractableMime(rawMime)
    ? rawMime
    : guessMimeFromFilename(file.name);
  if (!mime) {
    return {
      ok: false,
      error: `Unsupported file type. Upload PDF, DOCX, or TXT.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract first so we don't leave orphan files on disk if extraction fails.
  let extracted: string;
  try {
    extracted = await extractTextFromBuffer(buffer, mime);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to extract text: ${message}` };
  }
  if (!extracted.trim()) {
    return {
      ok: false,
      error:
        "File contains no readable text. Is it a scanned PDF without OCR?",
    };
  }

  const brand = await getOrCreateSingletonBrand();
  const dir = brandUploadDir(brand.id);
  await mkdir(dir, { recursive: true });

  const safeName = safeFilename(file.name);
  const onDiskName = await pickUniqueName(dir, safeName);
  const absolutePath = path.join(dir, onDiskName);
  await writeFile(absolutePath, buffer);

  const relative = path.relative(paths.root, absolutePath).replaceAll("\\", "/");

  const doc = await db.brandDoc.create({
    data: {
      brandId: brand.id,
      filename: file.name,
      mimeType: mime,
      category,
      sizeBytes: file.size,
      storagePath: relative,
      extracted,
    },
  });

  return { ok: true, id: doc.id, filename: file.name, chars: extracted.length };
}

export async function deleteBrandDoc(docId: string): Promise<void> {
  const doc = await db.brandDoc.findUnique({ where: { id: docId } });
  if (!doc) return;
  const absolute = path.join(paths.root, doc.storagePath);
  await unlink(absolute).catch(() => {
    // File already gone — log once, don't block DB delete.
    console.warn(`[brand] missing file on delete: ${absolute}`);
  });
  await db.brandDoc.delete({ where: { id: docId } });
}

// ---------- helpers ------------------------------------------------------

function safeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function pickUniqueName(dir: string, desired: string): Promise<string> {
  // We don't race-check here — single-user, single-threaded uploads in dev
  // make the timestamp suffix sufficient.
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
