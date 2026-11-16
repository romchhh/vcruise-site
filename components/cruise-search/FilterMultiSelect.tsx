"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type FilterMultiSelectOption = {
  value: string;
  label: string;
  /** Selecting this row toggles all of these leaf values instead of `value`. */
  expandsTo?: string[];
  /** Visual indent for child rows under a group. */
  nested?: boolean;
};

type Props = {
  label: string;
  options: FilterMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
};

function formatSelectionLabel(
  selected: FilterMultiSelectOption[],
  allLabel: string,
  placeholder: string,
) {
  if (selected.length === 0) return placeholder || allLabel;
  if (selected.length === 1) return selected[0].label;
  if (selected.length === 2) {
    return `${selected[0].label}, ${selected[1].label}`;
  }
  return `${selected[0].label} +${selected.length - 1}`;
}

export default function FilterMultiSelect({
  label,
  options,
  value,
  onChange,
  allLabel,
  placeholder,
  emptyLabel = "Немає варіантів",
  className = "relative flex flex-col gap-2",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const isOptionSelected = (option: FilterMultiSelectOption) => {
    if (option.expandsTo?.length) {
      return option.expandsTo.every((item) => selectedSet.has(item));
    }
    return selectedSet.has(option.value);
  };

  const selectedOptions = useMemo(() => {
    const covered = new Set<string>();
    const selected: FilterMultiSelectOption[] = [];

    for (const option of options) {
      if (!option.expandsTo?.length) continue;
      if (!option.expandsTo.every((item) => selectedSet.has(item))) continue;
      selected.push(option);
      for (const item of option.expandsTo) covered.add(item);
    }

    for (const item of value) {
      if (covered.has(item)) continue;
      const match = options.find((option) => option.value === item);
      selected.push(match ?? { value: item, label: item });
    }

    return selected;
  }, [options, value, selectedSet]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle) ||
        option.expandsTo?.some((item) => item.toLowerCase().includes(needle)),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (option: FilterMultiSelectOption) => {
    const targets = option.expandsTo?.length
      ? option.expandsTo
      : [option.value];
    const removing = targets.every((item) => selectedSet.has(item));

    if (removing) {
      const drop = new Set(targets);
      onChange(value.filter((item) => !drop.has(item)));
      return;
    }

    const next = [...value];
    const seen = new Set(next);
    for (const item of targets) {
      if (seen.has(item)) continue;
      seen.add(item);
      next.push(item);
    }
    onChange(next);
  };

  const clear = () => onChange([]);

  const display = formatSelectionLabel(
    selectedOptions,
    allLabel,
    placeholder || allLabel,
  );

  return (
    <div ref={rootRef} className={className}>
      <span className="text-caption font-semibold text-[color:var(--color-black)]">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={`field-control flex h-12 w-full items-center justify-between gap-3 bg-white px-4 text-left text-body ${
          open
            ? "border-[color:var(--color-brand)] ring-2 ring-[color:var(--color-brand)]/15"
            : "text-[color:var(--color-black)]"
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedOptions.length === 0 ? "text-subtitle" : ""
          }`}
        >
          {display}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selectedOptions.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Очистити"
              onClick={(event) => {
                event.stopPropagation();
                clear();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  clear();
                }
              }}
              className="rounded p-0.5 text-subtitle hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-black)]"
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-[color:var(--color-brand)] transition-transform ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-card border border-[color:var(--color-line)] bg-white py-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
        >
          {options.length > 8 ? (
            <div className="sticky top-0 z-10 border-b border-[color:var(--color-line)] bg-white px-3 pb-2 pt-1">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Пошук…"
                className="field-control h-9 w-full bg-white px-3 text-caption text-[color:var(--color-black)]"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}

          {!query.trim() ? (
            <button
              type="button"
              role="option"
              aria-selected={selectedOptions.length === 0}
              onClick={() => {
                clear();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-body text-[color:var(--color-black)] hover:bg-[color:var(--color-surface-hover)]"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  selectedOptions.length === 0
                    ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                    : "border-[color:var(--color-line)] bg-white"
                }`}
              >
                {selectedOptions.length === 0 ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                ) : null}
              </span>
              {allLabel}
            </button>
          ) : null}

          {filteredOptions.length === 0 ? (
            <p className="px-4 py-3 text-caption text-subtitle">
              {options.length === 0 ? emptyLabel : "Нічого не знайдено"}
            </p>
          ) : (
            filteredOptions.map((option) => {
              const selected = isOptionSelected(option);
              const isGroup = Boolean(option.expandsTo?.length);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggle(option)}
                  className={`flex w-full items-center gap-3 py-2.5 text-left text-body text-[color:var(--color-black)] hover:bg-[color:var(--color-surface-hover)] ${
                    option.nested ? "pl-8 pr-4" : "px-4"
                  } ${isGroup ? "font-semibold" : ""}`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white"
                        : "border-[color:var(--color-line)] bg-white"
                    }`}
                  >
                    {selected ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
