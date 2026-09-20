import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";

export interface MetaDropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface MetaDropdownProps<T extends string> {
  value: T;
  options: MetaDropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  /** Cap list height and scroll; each row counts as one visible slot. */
  maxVisibleRows?: number;
}

export function MetaDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  disabled = false,
  maxVisibleRows,
}: MetaDropdownProps<T>): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedLabel = options[selectedIndex]?.label ?? value;

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !maxVisibleRows) {
      return;
    }
    document
      .querySelector(`#${listId} .pps-meta-dropdown__option--active`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, maxVisibleRows, open]);

  function selectOption(index: number): void {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) {
      return;
    }

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(activeIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`pps-meta-dropdown ${className}`.trim()}>
      <button
        type="button"
        className="pps-form-control pps-meta-dropdown__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className="pps-meta-dropdown__value">{selectedLabel}</span>
      </button>

      {open ? (
        <ul
          id={listId}
          className={
            maxVisibleRows
              ? "pps-meta-dropdown__list pps-meta-dropdown__list--scroll"
              : "pps-meta-dropdown__list"
          }
          role="listbox"
          aria-label={ariaLabel}
          style={
            maxVisibleRows
              ? ({
                  "--pps-meta-dropdown-visible-rows": maxVisibleRows,
                } as CSSProperties)
              : undefined
          }
        >
          {options.map((option, index) => (
            <li key={option.value || "__empty__"} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={
                  index === activeIndex
                    ? "pps-meta-dropdown__option pps-meta-dropdown__option--active"
                    : "pps-meta-dropdown__option"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(index);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
