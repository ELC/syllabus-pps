import { useMemo, type ChangeEvent, type ReactElement } from "react";

import { cslItemTypes, type CslItemType, type ResourceCatalogEntry } from "@pps/core";
import { MetaDropdown } from "@pps/shell/MetaDropdown";

import { TYPE_LABELS } from "./draft";
import { DateInput } from "./DateInput";
import { FieldLabel } from "./FieldLabel";
import { NameFields } from "./NameFields";
import { ResourceUrlOpenLink } from "./ResourceUrlOpenLink";
import { dateInputToRaw, isValidHttpUrl, rawDateToInputValue } from "./form-utils";

const URL_VALIDATION_MESSAGE = "La URL debe comenzar con http:// o https://";

export interface ResourceFormProps {
  entry: ResourceCatalogEntry;
  onChange: (patch: Partial<ResourceCatalogEntry>) => void;
}

export function ResourceForm({ entry, onChange }: ResourceFormProps): ReactElement {
  const typeOptions = useMemo(
    () => cslItemTypes.map((type) => ({ value: type, label: TYPE_LABELS[type] })),
    [],
  );

  const urlValue = entry.URL ?? "";
  const urlInvalid = !isValidHttpUrl(urlValue);
  const showUrlValidation = urlInvalid && urlValue.trim().length > 0;
  const isBook = entry.type === "book";
  const isConferencePaper = entry.type === "paper-conference";
  const urlRowPaired = isBook || isConferencePaper;

  const eventUrlValue = entry["event-URL"] ?? "";
  const eventUrlInvalid = !isValidHttpUrl(eventUrlValue);
  const showEventUrlValidation = isConferencePaper && eventUrlInvalid && eventUrlValue.trim().length > 0;

  return (
    <form className="cites__form" onSubmit={(event) => event.preventDefault()}>
      <div
        className={
          isBook
            ? "cites__form-title-row cites__form-title-row--book cites__field cites__field--full"
            : "cites__form-title-row cites__field cites__field--full"
        }
      >
        <div className="cites__form-title-head">
          <span className="cites__label">Título</span>
          <span className="cites__resource-id" title="Identificador en el catálogo">
            Id: {entry.id || "—"}
          </span>
        </div>
        {isBook ? (
          <span className="cites__label cites__form-publisher-label">Editorial</span>
        ) : null}
        <span className="cites__label cites__form-type-label">Tipo</span>
        <input
          className="pps-form-control cites__form-title-input"
          type="text"
          value={entry.title}
          spellCheck={false}
          autoComplete="off"
          aria-label="Título"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange({ title: event.target.value })}
        />
        {isBook ? (
          <input
            className="pps-form-control cites__form-publisher-input"
            type="text"
            value={entry.publisher ?? ""}
            aria-label="Editorial"
            onChange={(event) => onChange({ publisher: event.target.value })}
          />
        ) : null}
        <MetaDropdown
          className="cites__form-type-select"
          value={entry.type}
          options={typeOptions}
          onChange={(type) => onChange({ type: type as CslItemType })}
          ariaLabel="Tipo"
        />
      </div>

      <div
        className={
          urlRowPaired
            ? "cites__form-url-row cites__form-url-row--paired cites__field cites__field--full"
            : "cites__field cites__field--full"
        }
      >
        <label className="cites__field">
          <FieldLabel
            label="URL"
            validationMessage={URL_VALIDATION_MESSAGE}
            visible={showUrlValidation}
            validationHintId="cites-url-validation"
          />
          <div className="cites__url-input-row">
            <ResourceUrlOpenLink url={urlValue} title={entry.title} />
            <input
              className={`pps-form-control${showUrlValidation ? " pps-form-control--invalid" : ""}`}
              type="url"
              inputMode="url"
              value={urlValue}
              spellCheck={false}
              autoComplete="url"
              placeholder="https://…"
              aria-invalid={showUrlValidation}
              aria-describedby={showUrlValidation ? "cites-url-validation" : undefined}
              onChange={(event) => onChange({ URL: event.target.value })}
            />
          </div>
        </label>

        {isBook ? (
          <label className="cites__field">
            <FieldLabel label="ISBN" />
            <input
              className="pps-form-control"
              type="text"
              value={entry.ISBN ?? ""}
              spellCheck={false}
              onChange={(event) => onChange({ ISBN: event.target.value })}
            />
          </label>
        ) : null}

        {isConferencePaper ? (
          <label className="cites__field">
            <FieldLabel
              label="URL del congreso"
              validationMessage={URL_VALIDATION_MESSAGE}
              visible={showEventUrlValidation}
              validationHintId="cites-event-url-validation"
            />
            <div className="cites__url-input-row">
              <ResourceUrlOpenLink url={eventUrlValue} title={entry.title} />
              <input
                className={`pps-form-control${showEventUrlValidation ? " pps-form-control--invalid" : ""}`}
                type="url"
                inputMode="url"
                value={eventUrlValue}
                spellCheck={false}
                autoComplete="url"
                placeholder="https://…"
                aria-invalid={showEventUrlValidation}
                aria-describedby={showEventUrlValidation ? "cites-event-url-validation" : undefined}
                onChange={(event) => onChange({ "event-URL": event.target.value })}
              />
            </div>
          </label>
        ) : null}
      </div>

      <div className="cites__form-dates-row cites__field cites__field--full">
        <label className="cites__field">
          <FieldLabel label="Publicación" />
          <DateInput
            aria-label="Publicación"
            value={rawDateToInputValue(entry.issued?.raw)}
            onChange={(next) => onChange({ issued: { raw: dateInputToRaw(next) } })}
          />
        </label>

        <label className="cites__field">
          <FieldLabel label="Consulta" />
          <DateInput
            aria-label="Consulta"
            value={rawDateToInputValue(entry.accessed?.raw)}
            onChange={(next) => onChange({ accessed: { raw: dateInputToRaw(next) } })}
          />
        </label>

        <label className="cites__field">
          <FieldLabel label="DOI" />
          <input
            className="pps-form-control"
            type="text"
            value={entry.DOI ?? ""}
            spellCheck={false}
            onChange={(event) => onChange({ DOI: event.target.value })}
          />
        </label>
      </div>

      <NameFields
        key={entry.id}
        label="Autores"
        names={entry.author ?? []}
        onChange={(author) => onChange({ author })}
      />
    </form>
  );
}
