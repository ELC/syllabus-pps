function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function siteBase(): string {
  const base = normalizeBase(import.meta.env.BASE_URL ?? "/");
  for (const suffix of ["cms/", "roadmap/"]) {
    if (base.endsWith(suffix)) {
      return base.slice(0, -suffix.length) || "/";
    }
  }
  return base;
}

export function appBase(defaultPath: string): string {
  const base = normalizeBase(import.meta.env.BASE_URL ?? defaultPath);
  if (base.endsWith("cms/") || base.endsWith("roadmap/")) {
    return base;
  }
  return normalizeBase(defaultPath);
}
