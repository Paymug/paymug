"use client";

import { useEffect, useState } from "react";
import {
  buttonBaseClass,
  buttonVariantClasses,
} from "@/components/ui.styles";

export function AutoRedirect({
  url,
  seconds = 3,
}: {
  url: string;
  seconds?: number;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;
    if (remaining <= 0) {
      window.location.assign(url);
      return;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cancelled, remaining, url]);

  return (
    <div className="mt-6 flex flex-col items-center gap-3" role="status">
      <p className="text-sm text-muted">
        {cancelled
          ? "Automatic redirect stopped."
          : `Taking you back in ${Math.max(remaining, 0)}s…`}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={url}
          className={`${buttonBaseClass} ${buttonVariantClasses.primary}`}
        >
          Continue
        </a>
        {!cancelled && (
          <button
            type="button"
            onClick={() => setCancelled(true)}
            className={`${buttonBaseClass} ${buttonVariantClasses.outline}`}
          >
            Stay on this page
          </button>
        )}
      </div>
    </div>
  );
}
