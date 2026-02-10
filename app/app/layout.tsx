import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { ReferralHandler } from "@/components/referral-handler";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import Script from "next/script";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "LookLikeme — AI стилист и генератор модных образов",
  description: "Загрузите своё фото — искусственный интеллект подберёт стильный look. 20 стилей, персональный AI стилист и поиск одежды на маркетплейсах.",
  keywords: ["fashion", "AI", "style", "outfit", "generator", "мода", "стиль", "AI стилист", "генератор образов", "примерка одежды"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <ReferralHandler />
          {children}
        </SessionProvider>
        <Footer />
        <CookieBanner />
        <Toaster position="top-right" richColors />

        {/* Cloudflare Turnstile */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
