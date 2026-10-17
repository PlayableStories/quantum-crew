// A modal panel: slides up from the bottom on portrait, opens as a right-hand panel on landscape (styles.css, Sheet).
// Native <dialog> + showModal(): the rest of the page goes inert. Tab and Shift+Tab cycle inside the sheet, Escape or
// a tap on the backdrop closes it, and focus returns to whatever opened it.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { S } from "../strings.ts";

type Props = { open: boolean; onClose: () => void; label: string; children: ReactNode };

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, label, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  // Every way of closing (Escape, backdrop, the close button) ends in the dialog's close event.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => {
      onClose();
      opener.current?.focus();
    };
    d.addEventListener("close", closed);
    return () => d.removeEventListener("close", closed);
  }, [onClose]);

  const trap = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={label}
      onKeyDown={trap}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="sheet__body">
        <button className="btn btn--ghost sheet__close" aria-label={S.sheet.close} onClick={() => ref.current?.close()}>
          <span aria-hidden="true">✕</span>
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
