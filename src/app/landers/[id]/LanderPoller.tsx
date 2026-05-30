"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While any section is still pending or running, refresh the detail page
// every 2.5 seconds. Stops automatically when the parent re-renders with
// `anyPending=false` and this component unmounts.
export function LanderPoller({ anyPending }: { anyPending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!anyPending) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [router, anyPending]);
  return null;
}
