/** Canonical production origin (no trailing slash). */
export const DEFAULT_SITE_ORIGIN = "https://vcruise.com.ua";

/** Hostnames that must 301 to the primary host (comma-separated in env). */
export const DEFAULT_REDIRECT_HOSTS = [
  "www.vcruise.com.ua",
  "vcruise.ua",
  "www.vcruise.ua",
] as const;

export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return fromEnv || DEFAULT_SITE_ORIGIN;
}

export function getPrimaryHostname(): string {
  try {
    return new URL(getSiteOrigin()).hostname.toLowerCase();
  } catch {
    return new URL(DEFAULT_SITE_ORIGIN).hostname;
  }
}

export function getRedirectHostnames(): ReadonlySet<string> {
  const raw =
    process.env.SITE_REDIRECT_HOSTS?.trim() ||
    DEFAULT_REDIRECT_HOSTS.join(",");

  return new Set(
    raw
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  );
}
