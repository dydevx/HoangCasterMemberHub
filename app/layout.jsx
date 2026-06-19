import "@/styles/global.css";

export const metadata = {
  title: "HoangCaster Member Hub",
  description: "Multi-tenant membership management SaaS for shops, services, customers, points, QR cards, promotions, and revenue reporting.",
  applicationName: "HoangCaster Member Hub",
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
