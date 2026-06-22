import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.js");
const productionBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/HoangCasterMemberHub";
const basePath = process.env.NODE_ENV === "production" ? productionBasePath : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { assetPrefix: basePath, basePath } : {}),
  reactStrictMode: true,
  devIndicators: false
};

export default withNextIntl(nextConfig);
