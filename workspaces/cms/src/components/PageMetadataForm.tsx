import { useEffect, useMemo, useState, type ReactElement } from "react";

import type { ResourceCatalogEntry } from "@pps/core";

import type { ConceptPageOption } from "../concept-pages";
import type { PageLinkOption } from "../page-link-options";
import {
  courseTrayectos,
  EDITOR_KINDS,
  type EditorPageKind,
  type PageMetadata,
} from "../page-document";
import { BodyEditor } from "./BodyEditor";
import { DependsOnCombobox } from "./DependsOnCombobox";
import { MetaDropdown } from "./MetaDropdown";

const KIND_LABELS: Record<EditorPageKind, string> = {
  degree: "Carrera",
  year: "Año",
  course: "Materia",
  concept: "Concepto",
  journal: "Diario",
  administrative: "Administrativa",
};

function titlePickerOptions(catalogTitles: string[], selected: string[], currentTitle: string): string[] {
  const merged = new Set(catalogTitles);
  for (const title of selected) {
    merged.add(title);
  }
  merged.delete(currentTitle.trim());
  return [...merged].sort((left, right) => left.localeCompare(right, "es-AR"));
}

export interface PageMetadataFormProps {
  metadata: PageMetadata;
  pageSlug: string;
  conceptTitles: string[];
  conceptPages: ConceptPageOption[];
  pageLinks: PageLinkOption[];
  courseTitles: string[];
  body: string;
  resources: ResourceCatalogEntry[];
  onChange: (metadata: PageMetadata) => void;
  onBodyChange: (body: string) => void;
}

export function PageMetadataForm({
  metadata,
  pageSlug,
  conceptTitles,
  conceptPages,
  pageLinks,
  courseTitles,
  body,
  resources,
  onChange,
  onBodyChange,
}: PageMetadataFormProps): ReactElement {
  const [dependsOnResetKey, setDependsOnResetKey] = useState(0);

  useEffect(() => {
    setDependsOnResetKey((current) => current + 1);
  }, [pageSlug]);

  function patch(partial: Partial<PageMetadata>): void {
    onChange({ ...metadata, ...partial });
  }

  const kindOptions = useMemo(
    () => EDITOR_KINDS.map((kind) => ({ value: kind, label: KIND_LABELS[kind] })),
    [],
  );

  const trayectoOptions = useMemo(
    () => [
      { value: "" as const, label: "Trayecto Principal (predeterminado)" },
      ...courseTrayectos.map((trayecto) => ({ value: trayecto, label: trayecto })),
    ],
    [],
  );

  const dependsOnChoices = titlePickerOptions(conceptTitles, metadata.dependsOn, metadata.title);
  const correlativasChoices = titlePickerOptions(
    courseTitles,
    metadata.correlativas,
    metadata.title,
  );

  const isCourse = metadata.kind === "course";

  return (
    <fieldset className="cms__meta">
      <legend className="u-visually-hidden">Metadatos</legend>
      <h2 className="cms__section-title">Metadatos</h2>
      <div className="cms__meta-grid">
        <div
          className={
            isCourse
              ? "cms__meta-field cms__meta-field--full cms__meta-title-row cms__meta-title-row--course"
              : "cms__meta-field cms__meta-field--full cms__meta-title-row"
          }
        >
          <div className="cms__meta-title-head">
            <span className="cms__meta-label">Título</span>
            <span className="cms__meta-slug" title="Slug en Storage (nombre del archivo)">
              Slug: {pageSlug}
            </span>
          </div>
          {isCourse ? <span className="cms__meta-label cms__meta-trayecto-label">Trayecto</span> : null}
          <span className="cms__meta-label cms__meta-kind-label">Tipo</span>
          <input
            className="cms__meta-input cms__meta-title-input"
            type="text"
            value={metadata.title}
            onChange={(event) => patch({ title: event.target.value })}
            spellCheck={false}
            autoComplete="off"
            aria-label="Título"
          />
          {isCourse ? (
            <MetaDropdown
              className="cms__meta-trayecto-select"
              value={metadata.trayecto}
              options={trayectoOptions}
              onChange={(trayecto) => patch({ trayecto })}
              ariaLabel="Trayecto"
            />
          ) : null}
          <MetaDropdown
            className="cms__meta-kind-select"
            value={metadata.kind}
            options={kindOptions}
            onChange={(kind) => patch({ kind })}
            ariaLabel="Tipo"
          />
        </div>

        {metadata.kind === "course" ? (
          <div className="cms__meta-field cms__meta-field--full">
            <span className="cms__meta-label">Correlativas:</span>
            {correlativasChoices.length === 0 ? (
              <p className="cms__meta-multiselect-empty">Todavía no hay otras páginas de materia cargadas.</p>
            ) : (
              <DependsOnCombobox
                key={`correlativas-${dependsOnResetKey}`}
                listboxId="cms-correlativas-dropdown"
                choices={correlativasChoices}
                selected={metadata.correlativas}
                onChange={(correlativas) => patch({ correlativas })}
                placeholderEmpty="Buscar materias para agregar…"
                placeholderMore="Agregar otra…"
                emptyWhenFiltered="Ninguna materia coincide."
                emptyWhenAllSelected="Ya están seleccionadas todas las materias."
                inputAriaLabel="Agregar correlativas"
              />
            )}
          </div>
        ) : null}

        {metadata.kind === "concept" ? (
          <div className="cms__meta-field cms__meta-field--full">
            <span className="cms__meta-label">Depende de otros conceptos:</span>
            {dependsOnChoices.length === 0 ? (
              <p className="cms__meta-multiselect-empty">Todavía no hay otras páginas de concepto cargadas.</p>
            ) : (
              <DependsOnCombobox
                key={dependsOnResetKey}
                choices={dependsOnChoices}
                selected={metadata.dependsOn}
                onChange={(dependsOn) => patch({ dependsOn })}
              />
            )}
          </div>
        ) : null}
      </div>
      <div className="cms__content-section">
        <h2 className="cms__section-title">Contenido</h2>
        <BodyEditor
          value={body}
          resources={resources}
          concepts={conceptPages}
          pageLinks={pageLinks}
          currentPageTitle={metadata.title}
          enableConceptHashtags={metadata.kind === "course"}
          historyKey={pageSlug}
          onChange={onBodyChange}
        />
      </div>
    </fieldset>
  );
}
