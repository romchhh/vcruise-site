let scrollLocks = 0;
let savedScrollY = 0;

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (scrollLocks === 0) {
    savedScrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  scrollLocks += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  if (scrollLocks === 0) return;
  scrollLocks -= 1;
  if (scrollLocks === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, savedScrollY);
    html.style.scrollBehavior = prevBehavior;
  }
}
