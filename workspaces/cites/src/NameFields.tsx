import type { ChangeEvent, ReactElement } from "react";
import type { CslName } from "@pps/core";

interface NameFieldsProps {
  label: string;
  names: CslName[];
  readOnly: boolean;
  onChange: (names: CslName[]) => void;
}

function patchName(name: CslName, field: keyof CslName, value: string): CslName {
  return { ...name, [field]: value };
}

export function NameFields({ label, names, readOnly, onChange }: NameFieldsProps): ReactElement {
  return (
    <fieldset className="cites__fieldset">
      <legend className="cites__legend">{label}</legend>
      {names.map((name, index) => (
        <div key={`${label}-${index}`} className="cites__name-row">
          <label className="cites__field">
            <span className="cites__label">Given</span>
            <input
              className="cites__input"
              value={name.given ?? ""}
              readOnly={readOnly}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = names.slice();
                next[index] = patchName(name, "given", event.target.value);
                onChange(next);
              }}
            />
          </label>
          <label className="cites__field">
            <span className="cites__label">Family</span>
            <input
              className="cites__input"
              value={name.family ?? ""}
              readOnly={readOnly}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = names.slice();
                next[index] = patchName(name, "family", event.target.value);
                onChange(next);
              }}
            />
          </label>
          <label className="cites__field cites__field--wide">
            <span className="cites__label">Literal</span>
            <input
              className="cites__input"
              value={name.literal ?? ""}
              readOnly={readOnly}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = names.slice();
                next[index] = patchName(name, "literal", event.target.value);
                onChange(next);
              }}
            />
          </label>
          <button
            type="button"
            className="cites__button cites__button--ghost"
            disabled={readOnly || names.length <= 1}
            onClick={() => onChange(names.filter((_, nameIndex) => nameIndex !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="cites__button cites__button--secondary"
        disabled={readOnly}
        onClick={() => onChange([...names, { given: "", family: "", literal: "" }])}
      >
        Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}
