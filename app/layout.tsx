import type { Metadata } from "next";
import { Barlow_Condensed, Barlow } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-head",
  weight: ["400", "600", "700", "800", "900"],
});

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FPL League",
  description: "Create a shareable FPL mini-league page for you and your mates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${barlow.variable}`} data-theme="slate" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('fpl-theme');
            if (t && ['slate','blue','green'].includes(t)) {
              document.documentElement.setAttribute('data-theme', t);
            }
          } catch(e) {}
        ` }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
