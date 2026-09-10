export function readPageParam(): string | null {
  const value = new URLSearchParams(window.location.search).get("page");
  return value?.trim() || null;
}

export function writePageParam(slug: string): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get("page") === slug) {
    return;
  }
  url.searchParams.set("page", slug);
  window.history.replaceState({}, "", url);
}
