import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { SvgAssetIcon } from "@pps/shell/SvgAssetIcon";
import warningSvg from "@pps/shell/assets/icons/ui-warning.svg?raw";

interface ConceptComboboxProps {
  choices: string[];
  selected: string[];
  labels: Map<string, string>;
  linkedSlugs: Set<string>;
  onChange: (values: string[]) => void;
  id: string;
  disabled?: boolean;
  warningTitles?: string[];
}

function sortByConceptLabel(
  left: string,
  right: string,
  labels: Map<string, string>,
): number {
  return (labels.get(left) ?? left).localeCompare(labels.get(right) ?? right, "es-AR");
}

export function ConceptCombobox({
  choices,
  selected,
  labels,
  linkedSlugs,
  onChange,
  id,
  disabled = false,
  warningTitles = [],
}: ConceptComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const warningRef = useRef<HTMLSpanElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [warningTooltipOpen, setWarningTooltipOpen] = useState(false);
  const [warningTooltipPos, setWarningTooltipPos] = useState({ top: 0, left: 0 });
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const { linkedSuggestions, otherSuggestions, orderedSuggestions } = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    const matching = choices.filter((value) => {
      if (selectedSet.has(value)) {
        return false;
      }
      return !normalized || (labels.get(value) ?? value).toLocaleLowerCase("es-AR").includes(normalized);
    });
    const linked = matching
      .filter((value) => linkedSlugs.has(value))
      .sort((left, right) => sortByConceptLabel(left, right, labels));
    const other = matching
      .filter((value) => !linkedSlugs.has(value))
      .sort((left, right) => sortByConceptLabel(left, right, labels));
    return {
      linkedSuggestions: linked,
      otherSuggestions: other,
      orderedSuggestions: [...linked, ...other],
    };
  }, [choices, labels, linkedSlugs, query, selectedSet]);
  const warningLabel =
    warningTitles.length > 0
      ? `Temas no vinculados a la materia: ${warningTitles.join(", ")}.`
      : null;

  useEffect(() => setActiveIndex(0), [query, orderedSuggestions.length, open]);

  function syncWarningTooltipPosition(): void {
    const anchor = warningRef.current;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    setWarningTooltipPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }

  function showWarningTooltip(): void {
    syncWarningTooltipPosition();
    setWarningTooltipOpen(true);
  }

  function hideWarningTooltip(): void {
    setWarningTooltipOpen(false);
  }

  useEffect(() => {
    if (!warningTooltipOpen) {
      return;
    }
    function reposition(): void {
      syncWarningTooltipPosition();
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [warningTooltipOpen]);

  function add(value: string): void {
    if (!selectedSet.has(value)) {
      onChange([...selected, value].sort((a, b) =>
        (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b, "es-AR"),
      ));
    }
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeAfterBlur(): void {
    window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setQuery("");
      }
    }, 120);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    } else if (event.key === "Backspace" && !query && selected.length) {
      onChange(selected.slice(0, -1));
    } else if (open && orderedSuggestions.length && event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % orderedSuggestions.length);
    } else if (open && orderedSuggestions.length && event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + orderedSuggestions.length) % orderedSuggestions.length);
    } else if (open && orderedSuggestions.length && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      add(orderedSuggestions[activeIndex]!);
    }
  }

  function renderSuggestion(value: string, optionIndex: number) {
    return (
      <li key={value}>
        <button
          type="button"
          className={optionIndex === activeIndex ? "is-active" : undefined}
          role="option"
          aria-selected={optionIndex === activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            add(value);
          }}
        >
          {labels.get(value) ?? value}
        </button>
      </li>
    );
  }

  return (
    <div
      className={
        disabled
          ? "planning__cell-editor planning__cell-editor--disabled"
          : "planning__cell-editor"
      }
      ref={rootRef}
    >
      {warningLabel ? (
        <span
          className="planning__warning"
          ref={warningRef}
          onMouseEnter={showWarningTooltip}
          onMouseLeave={hideWarningTooltip}
          onFocus={showWarningTooltip}
          onBlur={(event) => {
            if (!warningRef.current?.contains(event.relatedTarget as Node)) {
              hideWarningTooltip();
            }
          }}
        >
          <button
            type="button"
            className="planning__warning-trigger"
            aria-label={warningLabel}
            aria-describedby={warningTooltipOpen ? `${id}-warning-tooltip` : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <SvgAssetIcon
              svg={warningSvg}
              className="planning__warning-icon"
              focusable={false}
            />
          </button>
        </span>
      ) : null}
      {warningLabel && warningTooltipOpen
        ? createPortal(
            <div
              id={`${id}-warning-tooltip`}
              className="planning__warning-tooltip planning__warning-tooltip--portaled"
              role="tooltip"
              style={{
                top: `${warningTooltipPos.top}px`,
                left: `${warningTooltipPos.left}px`,
              }}
            >
              <span className="planning__warning-tooltip-title">
                Temas no vinculados a la materia
              </span>
              <ul className="planning__warning-tooltip-list">
                {warningTitles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
      <div
        className="planning__cell-editor-surface"
        onClick={() => {
          if (disabled) {
            return;
          }
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((value) => (
          <span className="planning__chip" key={value}>
            <span>{labels.get(value) ?? value}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Quitar ${labels.get(value) ?? value}`}
              onClick={(event) => {
                event.stopPropagation();
                onChange(selected.filter((item) => item !== value));
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={disabled}
          placeholder={selected.length ? "Agregar otro…" : "Buscar concepto…"}
          aria-label="Agregar concepto"
          aria-expanded={open}
          aria-controls={id}
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onBlur={closeAfterBlur}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && !disabled ? (
        <ul className="planning__cell-editor-list" id={id} role="listbox">
          {orderedSuggestions.length ? (
            (() => {
              let optionIndex = 0;
              return (
                <>
                  {linkedSuggestions.length ? (
                    <>
                      <li className="planning__cell-editor-group" role="presentation">
                        <span>Vinculados a la materia</span>
                      </li>
                      {linkedSuggestions.map((value) => renderSuggestion(value, optionIndex++))}
                    </>
                  ) : null}
                  {otherSuggestions.length ? (
                    <>
                      <li className="planning__cell-editor-group" role="presentation">
                        <span>Otros conceptos</span>
                      </li>
                      {otherSuggestions.map((value) => renderSuggestion(value, optionIndex++))}
                    </>
                  ) : null}
                </>
              );
            })()
          ) : (
            <li className="planning__cell-editor-empty">No hay conceptos disponibles.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
