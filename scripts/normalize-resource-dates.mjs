#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TARGETS = [
  join(ROOT, "content", "resources.json"),
  join(ROOT, "workspaces", "analytics-cli", "test", "fixtures", "content", "resources.json"),
];

function datePartsToRaw(parts) {
  const [year, month, day] = parts;
  if (year === undefined) return "";
  if (month !== undefined && day !== undefined) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (month !== undefined) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  return String(year);
}

function normalizeDate(date) {
  if (!date || typeof date !== "object") {
    return date;
  }

  if (typeof date.raw === "string" && date.raw.trim().length > 0) {
    return { raw: date.raw.trim() };
  }

  const parts = date["date-parts"]?.[0];
  if (!parts?.length) {
    return undefined;
  }

  return { raw: datePartsToRaw(parts) };
}

function normalizeCatalog(path) {
  const catalog = JSON.parse(readFileSync(path, "utf8"));
  let converted = 0;

  for (const entry of catalog) {
    for (const field of ["issued", "accessed"]) {
      const normalized = normalizeDate(entry[field]);
      if (entry[field]?.["date-parts"]?.length) {
        converted += 1;
      }
      if (normalized) {
        entry[field] = normalized;
      } else {
        delete entry[field];
      }
    }
  }

  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`${path}: converted ${converted} date field(s)`);
}

for (const target of TARGETS) {
  normalizeCatalog(target);
}
