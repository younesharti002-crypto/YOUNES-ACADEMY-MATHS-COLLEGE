import { ar, type Dictionary } from "./dictionaries/ar";
import { fr } from "./dictionaries/fr";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { ar, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
