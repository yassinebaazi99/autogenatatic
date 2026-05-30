"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refreshes the current /pages/[slug] route on an interval while any
 * AgentRun is in pending/running state. The server re-renders and this
 * component sees `active=false` once all runs settle; the effect then
 * unsubscribes on its next render.
 */
export function GenerationPoller({
  active,
  intervalMs = 2000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const handle = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(handle);
  }, [active, intervalMs, router]);

  return null;
}
