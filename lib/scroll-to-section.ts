const PENDING_SCROLL_KEY = "pendingScrollSection";

export function scrollToSection(hash: string) {
  const id = hash.replace(/^#/, "");
  const element = document.getElementById(id);
  if (!element) return false;

  const header = document.querySelector("header");
  const offset = (header?.getBoundingClientRect().height ?? 88) + 16;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });

  const nextHash = `#${id}`;
  if (window.location.hash !== nextHash) {
    history.pushState(null, "", nextHash);
  }

  return true;
}

export function queueScrollToSection(hash: string) {
  sessionStorage.setItem(PENDING_SCROLL_KEY, hash);
}

export function consumePendingScrollSection() {
  const hash = sessionStorage.getItem(PENDING_SCROLL_KEY);
  if (!hash) return null;

  sessionStorage.removeItem(PENDING_SCROLL_KEY);
  return hash;
}
