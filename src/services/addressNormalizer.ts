import { capitalizeWords } from "../utils/stringHelpers.js";

const CITY_ALIASES: Record<string, string> = {
  nyc: "New York",
  "new york city": "New York",
  la: "Los Angeles",
  sf: "San Francisco",
  münchen: "Munich",
  muenchen: "Munich",
  köln: "Cologne",
  koeln: "Cologne",
  düsseldorf: "Düsseldorf",
  duesseldorf: "Düsseldorf",
};

export interface NormalizedAddress {
  city: string;
  normalized: boolean;
}

export function normalizeCity(city: string): NormalizedAddress {
  const trimmed = city.trim();
  if (!trimmed) {
    return { city: "", normalized: false };
  }

  const aliasKey = trimmed.toLowerCase();
  if (CITY_ALIASES[aliasKey]) {
    return { city: CITY_ALIASES[aliasKey], normalized: true };
  }

  return { city: capitalizeWords(trimmed), normalized: trimmed !== capitalizeWords(trimmed) };
}

export function citiesMatch(a: string, b: string): boolean {
  return normalizeCity(a).city.toLowerCase() === normalizeCity(b).city.toLowerCase();
}
