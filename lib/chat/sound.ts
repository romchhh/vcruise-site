let sharedCtx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) sharedCtx = new AudioCtx();
  return sharedCtx;
}

/** Unlock audio after a user gesture (required by browsers). */
export function unlockChatSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function tone(
  frequency: number,
  startAt: number,
  duration: number,
  gainValue = 0.08
) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Soft double-beep for incoming visitor/agent messages. */
export function playIncomingChatSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();
    const now = ctx.currentTime;
    tone(880, now, 0.14, 0.1);
    tone(1175, now + 0.16, 0.14, 0.09);
  } catch {
    // ignore autoplay / unsupported
  }
}

/** Shorter ping for admin inbox when a new chat arrives. */
export function playNewChatSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();
    const now = ctx.currentTime;
    tone(740, now, 0.12, 0.1);
    tone(990, now + 0.14, 0.16, 0.11);
    tone(1240, now + 0.3, 0.12, 0.08);
  } catch {
    // ignore
  }
}

/** Distinct chime for a new lead/request in the admin. */
export function playNewLeadSound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();
    const now = ctx.currentTime;
    tone(660, now, 0.13, 0.11);
    tone(880, now + 0.15, 0.13, 0.1);
    tone(1100, now + 0.3, 0.18, 0.09);
  } catch {
    // ignore
  }
}
