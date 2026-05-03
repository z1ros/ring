import type { Metadata } from "next";
import { Unbounded, Inter } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ring — one ring. one date.",
  description:
    "voice ai dating. drop ur #, we ring once, lock the date before u hang up. no swipes. real humans. chicago, beta.",
  openGraph: {
    title: "ring — one ring. one date.",
    description:
      "voice ai dating. drop ur #, we ring once, lock the date before u hang up.",
    images: [{ url: "/cover.jpg", width: 1280, height: 819, alt: "ring" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ring — one ring. one date.",
    description: "voice ai dating. one ring. one date. no swipes.",
    images: ["/cover.jpg"],
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
