import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";

const CHIP_DRAG_MIME = "application/x-pps-cms-chip";

interface ChipDragPayload {
  group: string;
  fromListId: string;
  value: string;
}

/** Set on dragstart; browsers hide getData until drop. */
let activeChipDrag: ChipDragPayload | null = null;

function readChipDragPayload(event: DragEvent): ChipDragPayload | null {
  const raw = event.dataTransfer.getData(CHIP_DRAG_MIME);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ChipDragPayload;
    if (
      typeof parsed.group === "string" &&
      typeof parsed.fromListId === "string" &&
      typeof parsed.value === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

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
  /** Open the CMS page for this chip value (label click; remove button unchanged). */
  onChipActivate?: (value: string) => void;
  /** Enables dragging chips to another combobox with the same group id. */
  chipDragGroup?: string;
  /** Identifies this list when moving chips between comboboxes. */
  chipDragListId?: string;
  /** Called when a chip from another list in the group is dropped here. */
  onChipMoveFromList?: (value: string, fromListId: string) => void;
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
  onChipActivate,
  chipDragGroup,
  chipDragListId,
  onChipMoveFromList,
}: DependsOnComboboxProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropDepthRef = useRef(0);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draggingChip, setDraggingChip] = useState<string | null>(null);
  const [dropTargetActive, setDropTargetActive] = useState(false);

  const chipDragEnabled = Boolean(
    chipDragGroup && chipDragListId && onChipMoveFromList && !disabled,
  );

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

  function chipDragPayload(value: string): ChipDragPayload | null {
    if (!chipDragGroup || !chipDragListId) {
      return null;
    }
    return { group: chipDragGroup, fromListId: chipDragListId, value };
  }

  function incomingChipDrag(): ChipDragPayload | null {
    if (!chipDragEnabled || !activeChipDrag) {
      return null;
    }
    if (activeChipDrag.group !== chipDragGroup || activeChipDrag.fromListId === chipDragListId) {
      return null;
    }
    return activeChipDrag;
  }

  function handleFieldDragEnter(event: DragEvent<HTMLDivElement>): void {
    if (!incomingChipDrag()) {
      return;
    }
    event.preventDefault();
    dropDepthRef.current += 1;
    setDropTargetActive(true);
  }

  function handleFieldDragLeave(): void {
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) {
      setDropTargetActive(false);
    }
  }

  function handleFieldDragOver(event: DragEvent<HTMLDivElement>): void {
    if (!incomingChipDrag()) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleFieldDrop(event: DragEvent<HTMLDivElement>): void {
    dropDepthRef.current = 0;
    setDropTargetActive(false);
    event.preventDefault();
    const payload = readChipDragPayload(event) ?? incomingChipDrag();
    if (!payload) {
      return;
    }
    onChipMoveFromList?.(payload.value, payload.fromListId);
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
        className={[
          layout === "stacked"
            ? "cms__depends-on-field cms__depends-on-field--stacked"
            : "cms__depends-on-field",
          dropTargetActive ? "cms__depends-on-field--drop-target" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          inputRef.current?.focus();
          openList();
        }}
        onDragEnter={handleFieldDragEnter}
        onDragLeave={handleFieldDragLeave}
        onDragOver={handleFieldDragOver}
        onDrop={handleFieldDrop}
      >
        {selected.map((value) => (
          <span
            key={value}
            className={[
              "cms__depends-on-chip",
              chipDragEnabled ? "cms__depends-on-chip--draggable" : "",
              draggingChip === value ? "cms__depends-on-chip--dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            draggable={chipDragEnabled}
            onDragStart={(event) => {
              const payload = chipDragPayload(value);
              if (!payload) {
                return;
              }
              event.stopPropagation();
              activeChipDrag = payload;
              setDraggingChip(value);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(CHIP_DRAG_MIME, JSON.stringify(payload));
            }}
            onDragEnd={() => {
              activeChipDrag = null;
              setDraggingChip(null);
              dropDepthRef.current = 0;
              setDropTargetActive(false);
            }}
          >
            {onChipActivate ? (
              <button
                type="button"
                className="cms__depends-on-chip-label cms__depends-on-chip-open"
                title={`Abrir ${formatChoiceLabel(value)} en el editor`}
                draggable={false}
                onClick={(event) => {
                  event.stopPropagation();
                  onChipActivate(value);
                }}
              >
                {formatChoiceLabel(value)}
              </button>
            ) : (
              <span className="cms__depends-on-chip-label">{formatChoiceLabel(value)}</span>
            )}
            <button
              type="button"
              className="cms__depends-on-chip-remove"
              aria-label={`Quitar ${formatChoiceLabel(value)}`}
              disabled={disabled}
              draggable={false}
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
