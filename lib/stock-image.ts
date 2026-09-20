/**
 * Stock/placeholder photo helper.
 *
 * Uses LoremFlickr (keyword-based stock photography) so every image is
 * thematically relevant while the client swaps in real photography later.
 * `lock` pins a specific photo so it doesn't change between reloads.
 */
export function stockPhoto(
  keywords: string[],
  width: number,
  height: number,
  lock: number
) {
  const kw = keywords.join(",");
  return `https://loremflickr.com/${width}/${height}/${encodeURIComponent(
    kw
  )}/all?lock=${lock}`;
}
