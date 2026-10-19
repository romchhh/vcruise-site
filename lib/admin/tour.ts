const DONE_KEY = "vcruise_admin_tour_done";
const FORCE_KEY = "vcruise_admin_force_tour";
export const ADMIN_TOUR_EVENT = "vcruise:start-admin-tour";

export function isAdminTourForced(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FORCE_KEY) === "true";
}

export function shouldShowAdminTour(): boolean {
  if (typeof window === "undefined") return false;
  if (isAdminTourForced()) return true;
  return localStorage.getItem(DONE_KEY) !== "true";
}

export function requestAdminTour(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FORCE_KEY, "true");
  window.dispatchEvent(new Event(ADMIN_TOUR_EVENT));
}

export function completeAdminTour(): void {
  localStorage.setItem(DONE_KEY, "true");
  sessionStorage.removeItem(FORCE_KEY);
}
