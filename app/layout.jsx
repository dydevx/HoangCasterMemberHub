import "@/styles/global.css";

export const metadata = {
  title: "HoangCaster Member Hub",
  description: "MemberHub Next.js va Supabase cho quan ly hoi vien da cua hang."
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
