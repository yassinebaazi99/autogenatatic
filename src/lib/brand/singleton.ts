import "server-only";

import { db } from "../db";

// Single-user mode: there's exactly one Brand, and every upload/context call
// goes through it. Modeled as 1..N on disk so we can lift this restriction
// later without a migration.

const DEFAULT_BRAND_NAME = "My Brand";

export async function getOrCreateSingletonBrand() {
  const existing = await db.brand.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return db.brand.create({ data: { name: DEFAULT_BRAND_NAME } });
}
