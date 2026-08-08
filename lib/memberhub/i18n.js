import { dictionaries, locales } from "@/messages/memberhub";

export const defaultLocale = "vi";
export const fallbackLocale = "en";
const supportedLocaleIds = new Set(locales.map((locale) => locale.id));

export function normalizeLocale(locale) {
  if (!locale) return defaultLocale;
  return supportedLocaleIds.has(locale) ? locale : fallbackLocale;
}

export function toNestedMessages(messages) {
  return Object.entries(messages || {}).reduce((result, [key, value]) => {
    const parts = key.split(".");
    let cursor = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
      } else {
        cursor[part] ||= {};
        cursor = cursor[part];
      }
    });

    return result;
  }, {});
}

export function getMessagesForLocale(locale) {
  return toNestedMessages(dictionaries[normalizeLocale(locale)]);
}
