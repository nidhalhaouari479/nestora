"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = { title: string; onClose: () => void; children: ReactNode; variant?: "center" | "sheet"; icon?: ReactNode };

// Modal used by P17, P20 (centered) and P21B (bottom sheet). Escape and the backdrop close it.
export function Dialog({ title, onClose, children, variant = "center", icon }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className={`dialog-backdrop dialog-${variant}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        {icon && <div className="dialog-icon" aria-hidden="true">{icon}</div>}
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
