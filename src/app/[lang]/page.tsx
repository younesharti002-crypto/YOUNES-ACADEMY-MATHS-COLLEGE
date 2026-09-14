import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Positioning } from "@/components/site/Positioning";
import { About } from "@/components/site/About";
import { Offers } from "@/components/site/Offers";
import { WhyChoose } from "@/components/site/WhyChoose";
import { InstagramFeed } from "@/components/site/InstagramFeed";
import { CallToAction } from "@/components/site/CallToAction";
import { Footer } from "@/components/site/Footer";

export function generateStaticParams(): { lang: Locale }[] {
  return locales.map((lang) => ({ lang }));
}

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-board-900"
      >
        {dict.common.skipToContent}
      </a>

      <Header dict={dict} locale={lang} />

      <main id="main">
        <Hero dict={dict} />
        <Positioning dict={dict} />
        <About dict={dict} />
        <Offers dict={dict} />
        <WhyChoose dict={dict} />
        <InstagramFeed dict={dict} />
        <CallToAction dict={dict} locale={lang} />
      </main>

      <Footer dict={dict} locale={lang} />
    </>
  );
}
