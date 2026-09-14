import { CslDate } from "./types";

export function datePartsToRaw(parts: number[]): string {
  const [year, month, day] = parts;
  if (year === undefined) {
    return "";
  }

  if (month !== undefined && day !== undefined) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (month !== undefined) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  return String(year);
}

export function normalizeCslDate(date: CslDate | undefined): CslDate | undefined {
  if (!date) {
    return undefined;
  }

  if (typeof date.raw === "string" && date.raw.trim().length > 0) {
    return { raw: date.raw.trim() };
  }

  const parts = date["date-parts"]?.[0];
  if (!parts?.length) {
    return date.raw ? { raw: date.raw } : undefined;
  }

  return { raw: datePartsToRaw(parts) };
}

export function hasCslDate(date: CslDate | undefined): boolean {
  return Boolean(typeof date?.raw === "string" && date.raw.trim().length > 0);
}
