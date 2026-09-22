import type { ReactElement } from "react";

export interface FieldLabelProps {
  label: string;
  /** Shown inline next to the label when `visible` is true; space stays reserved when hidden. */
  validationMessage?: string;
  visible?: boolean;
  validationHintId?: string;
}

export function FieldLabel({
  label,
  validationMessage,
  visible = false,
  validationHintId,
}: FieldLabelProps): ReactElement {
  return (
    <div className="cites__field-label-row">
      <span className="cites__label">{label}</span>
      {validationMessage ? (
        <span
          id={validationHintId}
          className={
            visible
              ? "cites__field-hint cites__field-hint--error"
              : "cites__field-hint cites__field-hint--error cites__field-hint--reserved"
          }
          aria-hidden={!visible}
        >
          {validationMessage}
        </span>
      ) : null}
    </div>
  );
}
