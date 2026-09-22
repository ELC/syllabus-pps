export interface ConceptPageOption {
  title: string;
  slug: string;
}

export function filterConceptPages(concepts: ConceptPageOption[], query: string): ConceptPageOption[] {
  const normalized = query.trim().toLowerCase();
  const ranked = concepts
    .map((concept) => {
      const slug = concept.slug.toLowerCase();
      const title = concept.title.toLowerCase();
      let score = 0;
      if (!normalized) {
        score = 1;
      } else if (slug.startsWith(normalized)) {
        score = 4;
      } else if (slug.includes(normalized)) {
        score = 3;
      } else if (title.includes(normalized)) {
        score = 2;
      }
      return { concept, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.concept.slug.localeCompare(right.concept.slug, "es-AR");
    });

  return ranked.map((item) => item.concept);
}
