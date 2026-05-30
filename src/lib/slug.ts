import { randomBytes } from "node:crypto";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

/** `<slugified-name>-<6 hex>`, e.g. `acme-ceramic-kettle-a7f3b1`. */
export function uniqueSlug(base: string): string {
  const stem = slugify(base) || "landing";
  const suffix = randomBytes(3).toString("hex");
  return `${stem}-${suffix}`;
}
