import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, getMessagesForLocale } from "@/lib/memberhub/i18n";
import { locales } from "@/messages/memberhub";

const supportedLocales = new Set(locales.map((locale) => locale.id));

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("memberhub_locale")?.value;
  const locale = supportedLocales.has(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: getMessagesForLocale(locale)
  };
});
