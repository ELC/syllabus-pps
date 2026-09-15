export function readResourceParam(): string | null {
  const value = new URLSearchParams(window.location.search).get("id");
  return value?.trim() || null;
}

export function writeResourceParam(id: string): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get("id") === id) {
    return;
  }
  if (id) {
    url.searchParams.set("id", id);
  } else {
    url.searchParams.delete("id");
  }
  window.history.replaceState({}, "", url);
}
