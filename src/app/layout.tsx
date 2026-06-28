import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./providers";

export const metadata: Metadata = {
  title: "RJ Analytics — Siloam Heart Hospital",
  description: "Dashboard analisa rawat jalan: DCP, CWT, volume pasien, new vs existing.",
  keywords: ["rawat jalan", "DCP", "CWT", "analitik rumah sakit", "Siloam"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#1e266d" />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
