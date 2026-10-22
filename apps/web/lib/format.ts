export function formatPaise(paise: number): string {
  return `₹${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

/** Seconds -> "mm:ss" (or "h:mm:ss" past an hour). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}
