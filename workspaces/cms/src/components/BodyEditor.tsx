import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

import { normalizeTitle, type ResourceCatalogEntry } from "@pps/core";
import { citesNewResourceHref } from "@pps/shell/cites-link";

import { filterConceptPages, type ConceptPageOption } from "../concept-pages";
import { filterPageLinks, type PageLinkOption } from "../page-link-options";
import { getTextareaCaretOffset } from "../caret-coordinates";

const MAX_BODY_HISTORY = 200;
const ADD_NEW_CITATION_LABEL = "Agregar nuevo concepto";

function isAddNewCitationIndex(activeIndex: number, suggestionCount: number): boolean {
  return activeIndex === suggestionCount;
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z"
  );
}

function isRedoShortcut(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return false;
  }
  const key = event.key.toLowerCase();
  return (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.metaKey);
}

export interface CitationTrigger {
  /** Index after `@` or after `[@` where the typed query begins. */
  start: number;
  query: string;
  /** Start of the span to replace with `[@id]` (includes `[` or `@`). */
  insertStart: number;
}

export interface HashtagTrigger {
  /** Index after `#` where the typed query begins. */
  start: number;
  query: string;
  /** Index of `#`. */
  insertStart: number;
}

export interface WikilinkTrigger {
  /** Index after `[[` where the typed query begins. */
  start: number;
  query: string;
  /** Index of the first `[` in `[[`. */
  insertStart: number;
}

export type SuggestTrigger =
  | ({ kind: "citation" } & CitationTrigger)
  | ({ kind: "hashtag" } & HashtagTrigger)
  | ({ kind: "wikilink" } & WikilinkTrigger);

/** Find an in-progress `[@…` citation at the caret, or a bare `@` query suffix. */
export function findCitationTrigger(value: string, caret: number): CitationTrigger | null {
  const before = value.slice(0, caret);
  const bracketAt = before.lastIndexOf("[@");
  if (bracketAt >= 0) {
    const afterOpen = before.slice(bracketAt + 2);
    if (!afterOpen.includes("]")) {
      return { start: bracketAt + 2, query: afterOpen, insertStart: bracketAt };
    }
  }

  const at = before.lastIndexOf("@");
  if (at < 0) {
    return null;
  }

  const query = before.slice(at + 1);
  if (/[\s[\]]/.test(query)) {
    return null;
  }

  return { start: at + 1, query, insertStart: at };
}

/** In-progress native `#concept` tag at the caret (same token rules as the parser). */
export function findHashtagTrigger(value: string, caret: number): HashtagTrigger | null {
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s(])#([A-Za-z0-9À-ÿ_-]*)$/);
  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  const insertStart = before.length - query.length - 1;
  return { start: insertStart + 1, query, insertStart };
}

/** In-progress `[[page` wikilink at the caret (not `#[[…]]`). */
export function findWikilinkTrigger(value: string, caret: number): WikilinkTrigger | null {
  const before = value.slice(0, caret);
  const openAt = before.lastIndexOf("[[");
  if (openAt < 0) {
    return null;
  }
  if (openAt > 0 && before[openAt - 1] === "#") {
    return null;
  }

  const afterOpen = before.slice(openAt + 2);
  if (afterOpen.includes("]")) {
    return null;
  }
  if (/[\n\r]/.test(afterOpen)) {
    return null;
  }

  return { start: openAt + 2, query: afterOpen, insertStart: openAt };
}

function pickSuggestTrigger(candidates: Array<SuggestTrigger | null>): SuggestTrigger | null {
  let best: SuggestTrigger | null = null;
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (!best || candidate.insertStart >= best.insertStart) {
      best = candidate;
    }
  }
  return best;
}

export function findSuggestTrigger(value: string, caret: number): SuggestTrigger | null {
  const citation = findCitationTrigger(value, caret);
  const hashtag = findHashtagTrigger(value, caret);
  const wikilink = findWikilinkTrigger(value, caret);
  return pickSuggestTrigger([
    citation ? { kind: "citation", ...citation } : null,
    hashtag ? { kind: "hashtag", ...hashtag } : null,
    wikilink ? { kind: "wikilink", ...wikilink } : null,
  ]);
}

function suggestReplaceEnd(active: SuggestTrigger): number {
  if (active.kind === "hashtag") {
    return active.insertStart + 1 + active.query.length;
  }
  if (active.kind === "wikilink") {
    return active.insertStart + 2 + active.query.length;
  }
  return active.start + active.query.length;
}

function hashtagIsComplete(
  value: string,
  trigger: HashtagTrigger,
  concepts: ConceptPageOption[],
): boolean {
  const end = suggestReplaceEnd({ kind: "hashtag", ...trigger });
  const token = value.slice(trigger.insertStart, end);
  if (!token.startsWith("#")) {
    return false;
  }
  const slug = token.slice(1);
  return concepts.some((concept) => concept.slug === slug);
}

function wikilinkIsComplete(
  value: string,
  trigger: WikilinkTrigger,
  pages: PageLinkOption[],
): boolean {
  const end = suggestReplaceEnd({ kind: "wikilink", ...trigger });
  const inner = value.slice(trigger.insertStart + 2, end);
  if (!inner.trim()) {
    return false;
  }
  const normalized = normalizeTitle(inner);
  return pages.some(
    (page) => normalizeTitle(page.title) === normalized || page.slug === inner.trim(),
  );
}

function filterResources(resources: ResourceCatalogEntry[], query: string): ResourceCatalogEntry[] {
  const normalized = query.trim().toLowerCase();
  const ranked = resources
    .map((entry) => {
      const id = entry.id.toLowerCase();
      const title = entry.title.toLowerCase();
      let score = 0;
      if (!normalized) {
        score = 1;
      } else if (id.startsWith(normalized)) {
        score = 4;
      } else if (id.includes(normalized)) {
        score = 3;
      } else if (title.includes(normalized)) {
        score = 2;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.entry.id.localeCompare(right.entry.id);
    });

  return ranked.map((item) => item.entry);
}

export interface BodyEditorProps {
  value: string;
  resources: ResourceCatalogEntry[];
  concepts?: ConceptPageOption[];
  pageLinks?: PageLinkOption[];
  currentPageTitle?: string;
  enableConceptHashtags?: boolean;
  enablePageWikilinks?: boolean;
  historyKey: string;
  onChange: (value: string) => void;
}

export function BodyEditor({
  value,
  resources,
  concepts = [],
  pageLinks = [],
  currentPageTitle = "",
  enableConceptHashtags = false,
  enablePageWikilinks = true,
  historyKey,
  onChange,
}: BodyEditorProps): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [trigger, setTrigger] = useState<SuggestTrigger | null>(null);
  const [suggestStyle, setSuggestStyle] = useState<{ top: number; left: number } | null>(null);
  const pastRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const lastCommittedRef = useRef(value);
  const suppressHistoryRef = useRef(false);

  activeIndexRef.current = activeIndex;

  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastCommittedRef.current = value;
  }, [historyKey]);

  useEffect(() => {
    if (suppressHistoryRef.current) {
      return;
    }
    if (value === lastCommittedRef.current) {
      return;
    }
    lastCommittedRef.current = value;
    pastRef.current = [];
    futureRef.current = [];
  }, [value]);

  function pushHistory(): void {
    pastRef.current.push(lastCommittedRef.current);
    if (pastRef.current.length > MAX_BODY_HISTORY) {
      pastRef.current.shift();
    }
    futureRef.current = [];
  }

  function setBody(nextValue: string, recordHistory: boolean): void {
    if (recordHistory) {
      pushHistory();
    }
    lastCommittedRef.current = nextValue;
    suppressHistoryRef.current = true;
    onChange(nextValue);
    suppressHistoryRef.current = false;
    requestAnimationFrame(syncTrigger);
  }

  function undo(): void {
    const previous = pastRef.current.pop();
    if (previous === undefined) {
      return;
    }
    futureRef.current.push(lastCommittedRef.current);
    setBody(previous, false);
  }

  function redo(): void {
    const next = futureRef.current.pop();
    if (next === undefined) {
      return;
    }
    pastRef.current.push(lastCommittedRef.current);
    setBody(next, false);
  }

  const resourceSuggestions = useMemo(() => {
    if (!trigger || trigger.kind !== "citation") {
      return [];
    }
    return filterResources(resources, trigger.query);
  }, [resources, trigger]);

  const conceptSuggestions = useMemo(() => {
    if (!trigger || trigger.kind !== "hashtag" || !enableConceptHashtags) {
      return [];
    }
    return filterConceptPages(concepts, trigger.query);
  }, [concepts, enableConceptHashtags, trigger]);

  const wikilinkSuggestions = useMemo(() => {
    if (!trigger || trigger.kind !== "wikilink") {
      return [];
    }
    return filterPageLinks(pageLinks, trigger.query, currentPageTitle);
  }, [currentPageTitle, pageLinks, trigger]);

  const suggestOpen =
    trigger !== null &&
    (trigger.kind === "citation" ||
      (trigger.kind === "wikilink" && enablePageWikilinks) ||
      (trigger.kind === "hashtag" && enableConceptHashtags));
  const suggestListId =
    trigger?.kind === "hashtag"
      ? "cms-hashtag-suggest"
      : trigger?.kind === "wikilink"
        ? "cms-wikilink-suggest"
        : "cms-citation-suggest";
  const suggestOptionCount =
    trigger?.kind === "hashtag"
      ? conceptSuggestions.length
      : trigger?.kind === "wikilink"
        ? wikilinkSuggestions.length
        : resourceSuggestions.length + 1;
  const suggestVisibleCount =
    trigger?.kind === "hashtag"
      ? conceptSuggestions.length
      : trigger?.kind === "wikilink"
        ? wikilinkSuggestions.length
        : resourceSuggestions.length;

  const updateSuggestPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !trigger) {
      setSuggestStyle(null);
      return;
    }

    const atIndex =
      trigger.kind === "hashtag" || trigger.kind === "wikilink"
        ? trigger.insertStart
        : Math.max(0, trigger.start - 1);
    const caret = getTextareaCaretOffset(textarea, atIndex);
    const textareaRect = textarea.getBoundingClientRect();
    const computed = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.55;
    const dropdownWidth = 352;
    const maxLeft = Math.max(8, window.innerWidth - dropdownWidth - 8);

    setSuggestStyle({
      top: textareaRect.top + caret.top + lineHeight + 4,
      left: Math.min(textareaRect.left + caret.left, maxLeft),
    });
  }, [trigger]);

  const syncTrigger = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTrigger(null);
      return;
    }
    const next = findSuggestTrigger(textarea.value, textarea.selectionStart);
    if (next?.kind === "hashtag" && !enableConceptHashtags) {
      setTrigger(null);
      return;
    }
    if (next?.kind === "wikilink" && !enablePageWikilinks) {
      setTrigger(null);
      return;
    }
    if (next?.kind === "hashtag" && hashtagIsComplete(textarea.value, next, concepts)) {
      setTrigger(null);
      return;
    }
    if (next?.kind === "wikilink" && wikilinkIsComplete(textarea.value, next, pageLinks)) {
      setTrigger(null);
      return;
    }
    setTrigger(next);
  }, [concepts, enableConceptHashtags, enablePageWikilinks, pageLinks]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.query, trigger?.start]);

  useLayoutEffect(() => {
    if (!suggestOpen) {
      setSuggestStyle(null);
      return;
    }
    updateSuggestPosition();
  }, [suggestOpen, updateSuggestPosition, value, trigger?.query]);

  useLayoutEffect(() => {
    if (!suggestOpen) {
      return;
    }
    document
      .querySelector(`#${suggestListId} [role="option"][aria-selected="true"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, suggestListId, suggestOpen]);

  useEffect(() => {
    if (!suggestOpen) {
      return;
    }

    const reposition = (): void => {
      updateSuggestPosition();
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [suggestOpen, updateSuggestPosition]);

  function openNewCitesResource(): void {
    window.location.assign(citesNewResourceHref());
  }

  function applySuggestion(insertStart: number, caret: number, insertion: string): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const currentValue = textarea.value;
    const nextValue = `${currentValue.slice(0, insertStart)}${insertion}${currentValue.slice(caret)}`;
    const nextCaret = insertStart + insertion.length;

    setBody(nextValue, true);
    setTrigger(null);
    setActiveIndex(0);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function applyResource(entry: ResourceCatalogEntry): void {
    const textarea = textareaRef.current;
    if (!textarea || !trigger || trigger.kind !== "citation") {
      return;
    }

    const caret = textarea.selectionStart;
    const activeTrigger =
      findSuggestTrigger(textarea.value, caret) ??
      findSuggestTrigger(value, caret) ??
      trigger;
    if (activeTrigger.kind !== "citation") {
      return;
    }

    applySuggestion(activeTrigger.insertStart, suggestReplaceEnd(activeTrigger), `[@${entry.id}] `);
  }

  function applyConcept(concept: ConceptPageOption): void {
    if (!textareaRef.current || !trigger || trigger.kind !== "hashtag") {
      return;
    }

    applySuggestion(trigger.insertStart, suggestReplaceEnd(trigger), `#${concept.slug} `);
  }

  function applyWikilink(page: PageLinkOption): void {
    if (!textareaRef.current || !trigger || trigger.kind !== "wikilink") {
      return;
    }

    applySuggestion(trigger.insertStart, suggestReplaceEnd(trigger), `[[${page.title}]] `);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    if (suppressHistoryRef.current) {
      lastCommittedRef.current = event.target.value;
      onChange(event.target.value);
      requestAnimationFrame(syncTrigger);
      return;
    }
    setBody(event.target.value, true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (isUndoShortcut(event)) {
      if (pastRef.current.length > 0) {
        event.preventDefault();
        undo();
      }
      return;
    }

    if (isRedoShortcut(event)) {
      if (futureRef.current.length > 0) {
        event.preventDefault();
        redo();
      }
      return;
    }

    if (!suggestOpen) {
      return;
    }

    if (event.key === "ArrowDown") {
      if (suggestOptionCount === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((current) => (current + 1) % suggestOptionCount);
      return;
    }

    if (event.key === "ArrowUp") {
      if (suggestOptionCount === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setActiveIndex((current) => (current - 1 + suggestOptionCount) % suggestOptionCount);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const index = activeIndexRef.current;
      if (trigger?.kind === "citation") {
        if (isAddNewCitationIndex(index, resourceSuggestions.length)) {
          openNewCitesResource();
          return;
        }
        const entry = resourceSuggestions[index];
        if (entry) {
          applyResource(entry);
        }
        return;
      }

      if (trigger?.kind === "hashtag") {
        const concept = conceptSuggestions[index];
        if (concept) {
          applyConcept(concept);
        }
        return;
      }

      if (trigger?.kind === "wikilink") {
        const page = wikilinkSuggestions[index];
        if (page) {
          applyWikilink(page);
        }
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setTrigger(null);
    }
  }

  const suggestDropdownStyle: CSSProperties | undefined = suggestStyle
    ? {
        top: `${suggestStyle.top}px`,
        left: `${suggestStyle.left}px`,
      }
    : undefined;

  const suggestDropdown =
    suggestOpen && suggestStyle && trigger ? (
      <ul
        id={suggestListId}
        className={
          suggestVisibleCount >= 5
            ? "cms__citation-suggest cms__citation-suggest--anchored cms__citation-suggest--scroll"
            : "cms__citation-suggest cms__citation-suggest--anchored"
        }
        role="listbox"
        aria-label={
          trigger.kind === "hashtag"
            ? "Conceptos"
            : trigger.kind === "wikilink"
              ? "Páginas"
              : "Citas de recursos"
        }
        style={suggestDropdownStyle}
      >
        {trigger.kind === "hashtag" ? (
          conceptSuggestions.length === 0 ? (
            <li className="cms__citation-suggest-empty" role="presentation">
              Ningún concepto coincide.
            </li>
          ) : (
            conceptSuggestions.map((concept, index) => (
              <li key={concept.slug} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "cms__citation-suggest-item cms__citation-suggest-item--active"
                      : "cms__citation-suggest-item"
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyConcept(concept);
                  }}
                >
                  <span className="cms__citation-suggest-label">{concept.title}</span>
                </button>
              </li>
            ))
          )
        ) : trigger.kind === "wikilink" ? (
          wikilinkSuggestions.length === 0 ? (
            <li className="cms__citation-suggest-empty" role="presentation">
              Ninguna página coincide.
            </li>
          ) : (
            wikilinkSuggestions.map((page, index) => (
              <li key={page.slug} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "cms__citation-suggest-item cms__citation-suggest-item--active"
                      : "cms__citation-suggest-item"
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyWikilink(page);
                  }}
                >
                  <span className="cms__citation-suggest-label">{page.title}</span>
                </button>
              </li>
            ))
          )
        ) : resourceSuggestions.length === 0 ? (
          <li className="cms__citation-suggest-empty" role="presentation">
            Ningún recurso coincide.
          </li>
        ) : (
          resourceSuggestions.map((entry, index) => (
            <li key={entry.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? "cms__citation-suggest-item cms__citation-suggest-item--active"
                    : "cms__citation-suggest-item"
                }
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyResource(entry);
                }}
              >
                <span className="cms__citation-suggest-label">{entry.title}</span>
              </button>
            </li>
          ))
        )}
        {trigger.kind === "citation" ? (
          <li className="cms__citation-suggest-footer" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isAddNewCitationIndex(activeIndex, resourceSuggestions.length)}
              className={
                isAddNewCitationIndex(activeIndex, resourceSuggestions.length)
                  ? "cms__citation-suggest-item cms__citation-suggest-item--add cms__citation-suggest-item--active"
                  : "cms__citation-suggest-item cms__citation-suggest-item--add"
              }
              onMouseDown={(event) => {
                event.preventDefault();
                openNewCitesResource();
              }}
            >
              <span className="cms__citation-suggest-label">{ADD_NEW_CITATION_LABEL}</span>
            </button>
          </li>
        ) : null}
      </ul>
    ) : null;

  return (
    <div className="cms__body-editor">
      <div ref={wrapRef} className="cms__editor-wrap">
        <textarea
          ref={textareaRef}
          className="cms__editor"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={syncTrigger}
          onKeyUp={syncTrigger}
          onScroll={updateSuggestPosition}
          spellCheck={false}
          aria-autocomplete={suggestOpen ? "list" : undefined}
          aria-controls={suggestOpen ? suggestListId : undefined}
        />
      </div>
      {suggestDropdown ? createPortal(suggestDropdown, document.body) : null}
    </div>
  );
}
