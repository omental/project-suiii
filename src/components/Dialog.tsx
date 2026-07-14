"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, title, description, onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const preferredFocus =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(focusableSelector);
    preferredFocus?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled")
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      lastFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 px-0 backdrop-blur-sm motion-safe:animate-[fade-in_180ms_ease] sm:items-center sm:justify-center sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className="w-full rounded-t-[24px] border border-white/10 bg-[#121312] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-suii motion-safe:animate-[sheet-up_220ms_ease] sm:max-w-md sm:rounded-[20px] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="display text-3xl text-white">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="mt-1 text-sm text-suii-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="focus-ring grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
