import { dictionaries, locales } from "@/messages/memberhub";

export const defaultLocale = "vi";
const supportedLocaleIds = new Set(locales.map((locale) => locale.id));

export function normalizeLocale(locale) {
  return supportedLocaleIds.has(locale) ? locale : defaultLocale;
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
