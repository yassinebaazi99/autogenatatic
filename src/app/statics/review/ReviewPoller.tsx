"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Polls the review server component while there's still generation work in
// flight. Polling stops automatically because when every static finishes,
// the parent re-renders with `anyPending=false` and this component unmounts.
export function ReviewPoller({ anyPending }: { anyPending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!anyPending) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [router, anyPending]);
  return null;
}
