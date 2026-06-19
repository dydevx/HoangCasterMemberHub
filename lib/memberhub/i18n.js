import { dictionaries } from "@/messages/memberhub";

export const defaultLocale = "vi";

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
  return toNestedMessages(dictionaries[locale] || dictionaries[defaultLocale]);
}
