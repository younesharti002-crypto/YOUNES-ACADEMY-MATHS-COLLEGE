import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Cairo, Poppins } from "next/font/google";
import "../globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { isLocale, localeDirection, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050b13",
};

export function generateStaticParams(): { lang: Locale }[] {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: "THE SECRET ACADEMY",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [{ url: "/brand/secret-academy-logo.svg", type: "image/svg+xml" }],
      apple: [{ url: "/brand/secret-academy-logo.svg", type: "image/svg+xml" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "THE SECRET ACADEMY",
    },
    alternates: {
      languages: {
        ar: "/ar",
        fr: "/fr",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  return (
    <html lang={lang} dir={localeDirection[lang]}>
      <body className={`${poppins.variable} ${cairo.variable} antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
