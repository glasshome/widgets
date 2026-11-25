import { compileCatalogDir } from "@glasshome/widget-contract/catalog-build";
import type { CompiledCatalog } from "@glasshome/widget-contract/i18n-format";
import type { TestLanguage } from "@glasshome/widget-sdk/testing/tools";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "..", "src");

export function catalogsOf(dir: string): Record<string, CompiledCatalog> {
  return compileCatalogDir(join(SRC, dir, "locales"));
}

export function language(dir: string, tag: "en" | "fr" | "de" | "en-XA"): TestLanguage {
  const catalogs = catalogsOf(dir);
  const catalog = catalogs[tag];
  if (!catalog) throw new Error(`${dir} has no ${tag} catalog`);
  return {
    language: tag,
    formatting: tag.startsWith("en") ? "en-US" : tag,
    catalog: tag === "en" ? null : catalog,
    english: catalogs.en ?? null,
  };
}
