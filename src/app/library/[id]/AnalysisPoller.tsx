"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While analysis is pending, refresh the server component every 2 seconds
// so the Claude vision description appears as soon as the background
// after() job finishes. Mirrors the GenerationPoller pattern used on
// /pages/[slug] — revalidation stops as soon as the parent re-renders
// with analyzedAt set (since this component unmounts at that point).
export function AnalysisPoller({ refId }: { refId: string }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => router.refresh();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
    // refId is stable per mount — including it as a dep is correct even
    // though we don't read it directly, it makes the intent explicit.
  }, [router, refId]);
  return null;
}
