import { bookingUrlToSlug } from "./fourgates-offers";

const AJAX = "https://4gates.cruises/search/ajax.php";

export type CabinDeck = {
  number: string;
  imageUrl: string;
  cabins: string[];
};

export type CabinLegendItem = {
  imageUrl: string;
  label: string;
};

export type CabinAvailability = {
  /** Tariff is confirmed by a manager; there is no deck plan. */
  managerOnly: boolean;
  managerMessage?: string;
  guaranteeNote?: string;
  decks: CabinDeck[];
  legend: CabinLegendItem[];
};

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUploadUrl(value: string) {
  const url = value.trim();
  if (!url.startsWith("https://4gates.cruises/upload/")) return "";
  return url;
}

export function parseCabinAvailabilityHtml(html: string): CabinAvailability {
  const notify = html.match(
    /class=['"]notify[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
  );
  if (notify) {
    const message = stripTags(notify[1]);
    return {
      managerOnly: true,
      managerMessage:
        message ||
        "Каюта на моментальному підтвердженні, просимо зв’язатися з менеджером",
      decks: [],
      legend: [],
    };
  }

  const decks: CabinDeck[] = [];
  const menu = html.matchAll(
    /<li\s+data=['"](\d+)['"]\s+data-bg=['"]([^'"]*)['"]/gi,
  );

  for (const match of menu) {
    const number = match[1];
    const block = html.match(
      new RegExp(
        `id=['"]cabins_${number}['"][\\s\\S]*?<ul>([\\s\\S]*?)</ul>`,
        "i",
      ),
    );
    const cabins = block
      ? [...block[1].matchAll(/value=['"]([^'"]+)['"]/gi)].map(
          (item) => item[1],
        )
      : [];
    if (!cabins.length && number === "0") continue;
    decks.push({
      number,
      imageUrl: safeUploadUrl(match[2]),
      cabins,
    });
  }

  const legend: CabinLegendItem[] = [];
  const marks = html.matchAll(
    /<li[^>]*style=['"]background-image:\s*url\(['"]?([^'")]+)['"]?\)['"][^>]*>\s*<span>([^<]+)<\/span>/gi,
  );
  for (const mark of marks) {
    const imageUrl = safeUploadUrl(mark[1]);
    const label = stripTags(mark[2]);
    if (imageUrl && label) legend.push({ imageUrl, label });
  }

  const guarantee = html.includes("G00000") || /Геренті|гарант/i.test(html);
  let guaranteeNote: string | undefined;
  if (guarantee) {
    const note = html.match(/<div>([^<]*Геренті[^<]*)<\/div>/i);
    guaranteeNote = note
      ? stripTags(note[1])
      : "Каюти «Геренті» — без можливості обрати номер каюти та розташування.";
  }

  return {
    managerOnly: false,
    guaranteeNote,
    decks,
    legend,
  };
}

export async function fetchCabinAvailability(input: {
  bookingUrl: string;
  cabinCode: string;
  promoid: string;
  adults: number;
  childrenYoung: number;
  childrenTeen: number;
}): Promise<CabinAvailability> {
  const slug = bookingUrlToSlug(input.bookingUrl);
  if (!slug) {
    throw new Error("Некоректне посилання на круїз.");
  }

  const params = new URLSearchParams({
    act: "getcabinsavailability",
    locale: "ua",
    cabins_key: input.cabinCode,
    aduls: String(input.adults),
    childs: String(input.childrenYoung),
    childs1: String(input.childrenTeen),
    promoid: input.promoid,
    urls: slug,
  });

  const referer = input.bookingUrl.startsWith("http")
    ? input.bookingUrl
    : `https://4gates.cruises/ua/search/${slug}`;

  const res = await fetch(`${AJAX}?${params.toString()}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: referer,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`4gates повернув ${res.status}`);
  }

  return parseCabinAvailabilityHtml(await res.text());
}
