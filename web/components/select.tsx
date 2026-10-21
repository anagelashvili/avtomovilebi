"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * A dropdown in the site's style. The browser's own <select> list can't be
 * styled, so this draws its own (ARIA "select-only combobox" pattern):
 * keyboard (arrows, Home/End, Enter, Esc, type a letter), screen readers,
 * and plain HTML forms all work — the value is submitted under `name`.
 */
export function Select({
  label,
  options,
  name,
  defaultValue = "",
  value: controlled,
  onChange,
  required,
  className = "",
  labelClassName = "font-bold",
  inline = false,
}: {
  label: string;
  options: SelectOption[];
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  /** Label beside the box instead of above it. */
  inline?: boolean;
}) {
  const id = useId();
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options.find((o) => o.value === value);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(i: number) {
    const v = options[i].value;
    if (controlled === undefined) setOwn(v);
    onChange?.(v);
    setOpen(false);
    button.current?.focus();
  }

  function typeAhead(key: string) {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + key.toLowerCase(), at: now };
    const start = open ? active : selectedIndex;
    const order = [...options.slice(start + 1), ...options.slice(0, start + 1)];
    const hit = order.find((o) => o.label.toLowerCase().startsWith(typed.current.text));
    if (hit) {
      const i = options.indexOf(hit);
      if (open) setActive(i);
      else choose(i);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        typeAhead(e.key);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) typeAhead(e.key);
    }
  }

  return (
    <div ref={root} className={`${inline ? "flex items-center gap-2" : "flex flex-col gap-1.5"} ${className}`}>
      <span id={`${id}-label`} className={labelClassName}>{label}</span>
      <div className={`relative ${inline ? "" : "w-full"}`}>
        <button
          ref={button}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
          className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left font-normal transition-colors ${
            open ? "border-brand ring-2 ring-brand/20" : "border-field hover:border-brand/60"
          } focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30`}
        >
          <span className="truncate">{selected?.label ?? options[0]?.label}</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-none text-muted transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Carries the value in forms; `required` uses the browser's own check. */}
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onInvalid={() => button.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />

        {open && (
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="absolute left-0 top-full z-30 mt-1.5 max-h-72 w-full min-w-max overflow-auto rounded-lg border border-line bg-white p-1 shadow-[0_12px_32px_rgba(30,27,46,.16)]"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseMove={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()} // keep focus on the button
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2.5 ${
                  i === active ? "bg-brand-soft" : ""
                } ${o.value === value ? "font-semibold text-brand" : ""}`}
              >
                {o.label}
                {o.value === value && (
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
