const AJAX = "https://4gates.cruises/search/ajax.php";

export type CabinInfo = {
  title: string;
  images: string[];
  sections: { heading: string; lines: string[] }[];
};

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function safeImage(value: string) {
  const url = value.trim();
  if (!url.startsWith("https://4gates.cruises/upload/img/")) return "";
  return url;
}

export function parseCabinInfoHtml(html: string): CabinInfo {
  const title = stripTags(html.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
  const images = [
    ...html.matchAll(
      /background-image:\s*url\(['"]?(https:\/\/4gates\.cruises\/upload\/img\/[^'")]+)['"]?\)/gi,
    ),
  ]
    .map((match) => safeImage(match[1]))
    .filter(Boolean);

  const sections = parseCabinSections(html);

  return { title, images: [...new Set(images)], sections };
}

function linesOf(text: string) {
  return text
    .split("\n")
    .map((part) => part.trim().replace(/;$/, ""))
    .filter(Boolean);
}

function parseCabinSections(html: string): CabinInfo["sections"] {
  const listItems = [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((match) =>
    stripTags(match[1]),
  );
  if (listItems.length) {
    const headings = ["ПЛОЩА", "РОЗМІЩЕННЯ", "В КАЮТІ"];
    if (listItems.length <= headings.length) {
      return listItems.map((line, index) => ({
        heading: headings[index] ?? "Опис",
        lines: linesOf(line),
      }));
    }
    return [{ heading: "Опис", lines: listItems }];
  }

  const right = html.match(/popup-cabin__right([\s\S]*)$/i)?.[1] ?? html;
  const paragraphs = [...right.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  return paragraphs.map((paragraph) => {
    const lines = linesOf(paragraph);
    const intro = lines[0]?.endsWith(":") ? lines[0].replace(/:$/, "") : "";
    if (intro && lines.length > 1) {
      return { heading: intro, lines: lines.slice(1) };
    }
    return { heading: "", lines };
  });
}

export async function fetchCabinInfo(
  shipId: string,
  cabinCode: string,
): Promise<CabinInfo> {
  const params = new URLSearchParams({
    act: "get_cabins_popup",
    key: cabinCode,
    ship_id: shipId,
    locale: "ua",
  });
  const res = await fetch(`${AJAX}?${params.toString()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://4gates.cruises/ua/search/",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`4gates повернув ${res.status}`);
  }
  return parseCabinInfoHtml(await res.text());
}
