function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function cmsBase(): string {
  return normalizeBase(import.meta.env.BASE_URL ?? "/cms/");
}

export function siteBase(): string {
  const cms = cmsBase();
  const suffix = "cms/";
  if (cms.endsWith(suffix)) {
    return cms.slice(0, -suffix.length) || "/";
  }
  return "/";
}
