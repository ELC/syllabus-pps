import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";

function listChoices(
  choices: string[],
  selected: Set<string>,
  query: string,
  formatLabel: (value: string) => string,
): string[] {
  const available = choices.filter((value) => !selected.has(value));
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return available;
  }
  return available.filter(
    (value) =>
      value.toLowerCase().includes(normalized) ||
      formatLabel(value).toLowerCase().includes(normalized),
  );
}

export interface DependsOnComboboxProps {
  choices: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  listboxId?: string;
  placeholderEmpty?: string;
  placeholderMore?: string;
  emptyWhenFiltered?: string;
  emptyWhenAllSelected?: string;
  inputAriaLabel?: string;
  /** inline: chips in a row (default). stacked: one column. */
  layout?: "inline" | "stacked";
  /** Display label for each choice value (default: value as-is). */
  formatChoiceLabel?: (value: string) => string;
}

export function DependsOnCombobox({
  choices,
  selected,
  onChange,
  disabled = false,
  listboxId = "cms-depends-on-dropdown",
  placeholderEmpty = "Buscar conceptos para agregar…",
  placeholderMore = "Agregar otro…",
  emptyWhenFiltered = "Ningún concepto coincide.",
  emptyWhenAllSelected = "Ya están seleccionados todos los conceptos.",
  inputAriaLabel = "Agregar dependencias de concepto",
  layout = "inline",
  formatChoiceLabel = (value) => value,
}: DependsOnComboboxProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const suggestions = useMemo(
    () => listChoices(choices, selectedSet, query, formatChoiceLabel),
    [choices, formatChoiceLabel, query, selectedSet],
  );
  const dropdownOpen = !disabled && listOpen;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length, listOpen]);

  function openList(): void {
    if (!disabled) {
      setListOpen(true);
    }
  }

  function closeList(): void {
    setListOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function addTitle(title: string): void {
    if (selectedSet.has(title)) {
      return;
    }
    const next = [...selected, title].sort((left, right) =>
      formatChoiceLabel(left).localeCompare(formatChoiceLabel(right), "es-AR"),
    );
    onChange(next);
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function removeTitle(title: string): void {
    onChange(selected.filter((entry) => entry !== title));
  }

  function handleBlur(): void {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (rootRef.current?.contains(active)) {
        return;
      }
      closeList();
    }, 120);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      return;
    }

    if (!dropdownOpen) {
      if (event.key === "Backspace" && query === "" && selected.length > 0) {
        removeTitle(selected[selected.length - 1]!);
      }
      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const title = suggestions[activeIndex];
      if (title) {
        addTitle(title);
      }
    }
  }

  return (
    <div
      className={layout === "stacked" ? "cms__depends-on cms__depends-on--stacked" : "cms__depends-on"}
      ref={rootRef}
    >
      <div
        className={
          layout === "stacked"
            ? "cms__depends-on-field cms__depends-on-field--stacked"
            : "cms__depends-on-field"
        }
        onClick={() => {
          inputRef.current?.focus();
          openList();
        }}
      >
        {selected.map((value) => (
          <span key={value} className="cms__depends-on-chip">
            <span className="cms__depends-on-chip-label">{formatChoiceLabel(value)}</span>
            <button
              type="button"
              className="cms__depends-on-chip-remove"
              aria-label={`Quitar ${formatChoiceLabel(value)}`}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                removeTitle(value);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="search"
          className="cms__depends-on-input"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            openList();
          }}
          onFocus={openList}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholderEmpty : placeholderMore}
          spellCheck={false}
          autoComplete="off"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={inputAriaLabel}
        />
      </div>

      {dropdownOpen ? (
        <ul id={listboxId} className="cms__depends-on-dropdown" role="listbox">
          {suggestions.length === 0 ? (
            <li className="cms__depends-on-dropdown-empty" role="presentation">
              {query.trim() ? emptyWhenFiltered : emptyWhenAllSelected}
            </li>
          ) : (
            suggestions.map((value, index) => (
              <li key={value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "cms__depends-on-option cms__depends-on-option--active"
                      : "cms__depends-on-option"
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addTitle(value);
                  }}
                >
                  {formatChoiceLabel(value)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
