import * as Flags from "country-flag-icons/react/3x2";

type FlagComponent = (typeof Flags)["IT"];

const FLAG_BY_CODE = Flags as Record<string, FlagComponent>;

/** SVG flag. Unicode emoji flags break on Windows, so this is the same image everywhere. */
export default function CountryFlag({ code }: { code: string }) {
  const Flag = FLAG_BY_CODE[code];
  if (!Flag) return null;

  return (
    <span
      aria-hidden
      className="inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.14)]"
    >
      <Flag className="h-full w-full" />
    </span>
  );
}
