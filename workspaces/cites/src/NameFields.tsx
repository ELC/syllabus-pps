import { useEffect, useState, type ChangeEvent, type ReactElement } from "react";

import type { CslName } from "@pps/core";
import { MetaDropdown } from "@pps/shell/MetaDropdown";

import { FieldLabel } from "./FieldLabel";

type AuthorNameKind = "personal" | "literal";

const NAME_KIND_OPTIONS: Array<{ value: AuthorNameKind; label: string }> = [
  { value: "personal", label: "Nombre y apellido" },
  { value: "literal", label: "Literal" },
];

interface NameFieldsProps {
  label: string;
  names: CslName[];
  onChange: (names: CslName[]) => void;
}

function inferNameKind(name: CslName): AuthorNameKind {
  const literal = (name.literal ?? "").trim();
  const given = (name.given ?? "").trim();
  const family = (name.family ?? "").trim();
  if (literal && !given && !family) {
    return "literal";
  }
  return "personal";
}

function inferRowKinds(names: CslName[]): AuthorNameKind[] {
  return names.map((name) => inferNameKind(name));
}

function setNameKind(name: CslName, kind: AuthorNameKind): CslName {
  if (kind === "literal") {
    return { given: "", family: "", literal: name.literal ?? "" };
  }
  return { given: name.given ?? "", family: name.family ?? "", literal: "" };
}

function syncRowKinds(previous: AuthorNameKind[], names: CslName[]): AuthorNameKind[] {
  return names.map((name, index) => {
    if (index < previous.length) {
      return previous[index]!;
    }
    return inferNameKind(name);
  });
}

export function NameFields({ label, names, onChange }: NameFieldsProps): ReactElement {
  const [rowKinds, setRowKinds] = useState<AuthorNameKind[]>(() => inferRowKinds(names));

  useEffect(() => {
    setRowKinds((previous) => {
      if (previous.length === names.length) {
        return previous;
      }
      return syncRowKinds(previous, names);
    });
  }, [names, names.length]);

  function updateKind(index: number, nextKind: AuthorNameKind): void {
    setRowKinds((previous) => {
      const next = previous.slice();
      next[index] = nextKind;
      return next;
    });
    const next = names.slice();
    next[index] = setNameKind(names[index]!, nextKind);
    onChange(next);
  }

  function removeAt(index: number): void {
    setRowKinds((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
    onChange(names.filter((_, nameIndex) => nameIndex !== index));
  }

  function addAuthor(): void {
    setRowKinds((previous) => [...previous, "personal"]);
    onChange([...names, { given: "", family: "", literal: "" }]);
  }

  return (
    <fieldset className="cites__fieldset cites__field cites__field--full">
      <legend className="cites__legend">{label}</legend>
      {names.map((name, index) => {
        const kind = rowKinds[index] ?? inferNameKind(name);
        return (
          <div
            key={`${label}-${index}`}
            className={
              kind === "literal" ? "cites__name-row cites__name-row--literal" : "cites__name-row"
            }
          >
            <div className="cites__name-kind">
              <FieldLabel label="Formato" />
              <MetaDropdown
                value={kind}
                options={NAME_KIND_OPTIONS}
                ariaLabel="Formato del autor"
                onChange={(nextKind) => updateKind(index, nextKind)}
              />
            </div>

            {kind === "personal" ? (
              <>
                <label className="cites__field">
                  <FieldLabel label="Nombre" />
                  <input
                    className="pps-form-control"
                    type="text"
                    value={name.given ?? ""}
                    autoComplete="off"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const next = names.slice();
                      next[index] = { ...name, given: event.target.value, literal: "" };
                      onChange(next);
                    }}
                  />
                </label>
                <label className="cites__field">
                  <FieldLabel label="Apellido" />
                  <input
                    className="pps-form-control"
                    type="text"
                    value={name.family ?? ""}
                    autoComplete="off"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const next = names.slice();
                      next[index] = { ...name, family: event.target.value, literal: "" };
                      onChange(next);
                    }}
                  />
                </label>
              </>
            ) : (
              <label className="cites__field cites__name-literal">
                <FieldLabel label="Literal" />
                <input
                  className="pps-form-control"
                  type="text"
                  value={name.literal ?? ""}
                  autoComplete="off"
                  placeholder="Organización o nombre completo"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const next = names.slice();
                    next[index] = { given: "", family: "", literal: event.target.value };
                    onChange(next);
                  }}
                />
              </label>
            )}

            <button
              type="button"
              className="cites__name-row-remove"
              disabled={names.length <= 1}
              aria-label="Quitar autor"
              onClick={() => removeAt(index)}
            >
              <span className="cites__button-icon" aria-hidden="true">
                ×
              </span>
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="cites__button cites__button--icon cites__name-add"
        aria-label="Agregar autor"
        onClick={addAuthor}
      >
        <span className="cites__button-icon" aria-hidden="true">
          +
        </span>
      </button>
    </fieldset>
  );
}
