import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getMessagesForLocale, normalizeLocale } from "@/lib/memberhub/i18n";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("memberhub_locale")?.value);

  return {
    locale,
    messages: getMessagesForLocale(locale)
  };
});
