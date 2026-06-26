import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

/**
 * First-visit language follows the browser. This is a HU-first festival app, so
 * any declared Hungarian preference wins — even when it isn't the top entry. iOS
 * Safari sends the whole "Preferred Language Order", which often lists English
 * before Hungarian on a Hungarian-locale device, so checking only the first tag
 * would wrongly show EN. Only with no Hungarian at all do we fall back to EN;
 * with no header we keep the festival's HU default. The cookie always wins once
 * the user toggles the language.
 */
function fromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const langs = header.toLowerCase().split(",").map((part) => part.split(";")[0].trim());
  return langs.some((l) => l === "hu" || l.startsWith("hu-")) ? "hu" : "en";
}

export default getRequestConfig(async () => {
  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue)
    ? cookieValue
    : fromAcceptLanguage((await headers()).get("accept-language"));
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
