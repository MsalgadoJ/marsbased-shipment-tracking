"use client";

import { Info } from "lucide-react";
import { useId, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Explanation on hover or keyboard focus. Positioned as `fixed` so a scrolling table does not clip it.
 */
export function Hint({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  const [at, setAt] = useState<CSSProperties>();

  function show(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 296));
    // Below the trigger, or above it when there is no room left in the viewport.
    setAt(r.bottom + 140 > window.innerHeight ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
  }

  return (
    <span
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setAt(undefined)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setAt(undefined)}
      className="inline-flex cursor-help items-center gap-1 rounded-full"
    >
      {children}
      <Info className="size-3.5 text-slate-400" aria-hidden />
      <span
        id={id}
        role="tooltip"
        style={at}
        className={at ? "fixed z-50 w-72 rounded-md bg-slate-900 px-3 py-2 text-xs leading-relaxed font-normal text-white shadow-lg" : "sr-only"}
      >
        {text}
      </span>
    </span>
  );
}
