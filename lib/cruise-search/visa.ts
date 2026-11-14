import { countryCodeFromPlace } from "./country-flag";

/** ISO codes for countries 4gates marked with visa (`<sup>V</sup>`). */
export function visaCountryCodes(visaCountries: string[] | undefined) {
  const codes = new Set<string>();
  for (const name of visaCountries ?? []) {
    const code = countryCodeFromPlace(name);
    if (code) codes.add(code);
  }
  return codes;
}

export function placeNeedsVisa(
  place: string,
  visaCountries: string[] | undefined,
) {
  if (!place || !visaCountries?.length) return false;
  const code = countryCodeFromPlace(place);
  if (code && visaCountryCodes(visaCountries).has(code)) return true;

  const foldedPlace = place.toLowerCase();
  return visaCountries.some((name) => {
    const folded = name.toLowerCase();
    return (
      foldedPlace === folded ||
      foldedPlace.includes(folded) ||
      folded.includes(foldedPlace)
    );
  });
}
