import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

import { CitesMonthCaption } from "./CitesMonthCaption";
import {
  formatIsoDateForDisplay,
  isoDateFromDate,
  parseIsoDate,
} from "./form-utils";

import "react-day-picker/style.css";

const POPOVER_WIDTH_PX = 320;

export interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
}

export function DateInput({ value, onChange, "aria-label": ariaLabel }: DateInputProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selectedDate ?? new Date());
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const displayValue = formatIsoDateForDisplay(value);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (open) {
      setMonth(selectedDate ?? today);
    }
  }, [open, selectedDate, today]);

  const updatePopoverPosition = (): void => {
    const anchor = rootRef.current;
    if (!anchor) {
      setPopoverStyle(null);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: `${rect.bottom + 4}px`,
      left: `${Math.min(rect.left, Math.max(8, window.innerWidth - POPOVER_WIDTH_PX - 8))}px`,
      width: `${POPOVER_WIDTH_PX}px`,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPopoverStyle(null);
      return;
    }
    updatePopoverPosition();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    const reposition = (): void => {
      updatePopoverPosition();
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const popover =
    open && popoverStyle ? (
      <div
        ref={popoverRef}
        id={listId}
        className="cites-date-picker__popover cites-date-picker__popover--anchored"
        role="dialog"
        aria-label={ariaLabel}
        style={popoverStyle}
      >
        <DayPicker
          className="cites-date-picker__calendar"
          mode="single"
          locale={es}
          captionLayout="label"
          hideNavigation
          month={month}
          onMonthChange={setMonth}
          components={{ MonthCaption: CitesMonthCaption }}
          selected={selectedDate ?? undefined}
          onSelect={(date) => {
            if (date) {
              onChange(isoDateFromDate(date));
              setOpen(false);
            }
          }}
        />

        <div className="cites-date-picker__footer">
          <button
            type="button"
            className="cites-date-picker__footer-action"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Borrar
          </button>
          <button
            type="button"
            className="cites-date-picker__footer-action"
            onClick={() => {
              onChange(isoDateFromDate(today));
              setOpen(false);
            }}
          >
            Hoy
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="cites-date-picker">
      <button
        type="button"
        className="pps-form-control cites-date-picker__trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={displayValue ? undefined : "cites-date-picker__placeholder"}>
          {displayValue || "Seleccionar fecha"}
        </span>
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
