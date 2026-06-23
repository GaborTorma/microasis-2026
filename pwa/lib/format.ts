import type { I18nText } from "./types";

export const FESTIVAL_TZ = "Europe/Budapest";

const intlLocale = (locale: string) => (locale === "hu" ? "hu-HU" : "en-GB");

/** Read a translatable value for the active locale. */
export function tx(text: I18nText | null | undefined, locale: string): string {
  if (!text) return "";
  return locale === "hu" ? text.hu : text.en;
}

/** ISO instant → "HH:mm" in festival time. */
export function hhmm(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: FESTIVAL_TZ,
  });
}

/** "YYYY-MM-DD" festival day → short weekday + date, e.g. "Thu 9 Jul". */
export function dayLabel(day: string, locale: string): string {
  return new Date(`${day}T12:00:00+02:00`).toLocaleDateString(
    intlLocale(locale),
    { weekday: "short", day: "numeric", month: "short", timeZone: FESTIVAL_TZ },
  );
}

/** Very short day pill, e.g. "Thu". */
export function weekday(day: string, locale: string): string {
  return new Date(`${day}T12:00:00+02:00`).toLocaleDateString(
    intlLocale(locale),
    { weekday: "short", timeZone: FESTIVAL_TZ },
  );
}

/** Day-of-month number for the day pill. */
export function dayNum(day: string): string {
  return String(Number(day.slice(8, 10)));
}

/** "YYYY-MM-DD" → "MM.DD" (e.g. "07.08"). */
export function mmdd(day: string): string {
  return `${day.slice(5, 7)}.${day.slice(8, 10)}`;
}

/** Full, capitalised weekday name, e.g. "Wednesday" / "Szerda". */
export function weekdayLong(day: string, locale: string): string {
  const s = new Date(`${day}T12:00:00+02:00`).toLocaleDateString(
    intlLocale(locale),
    { weekday: "long", timeZone: FESTIVAL_TZ },
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}
