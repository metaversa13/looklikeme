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
      <head>
        <meta name="verify-admitad" content="fb4f9df1cc" />
        <meta name="yandex-verification" content="0036aea8c74d2adf" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <ReferralHandler />
          {children}
        </SessionProvider>
        <Footer />
        <CookieBanner />
        <Toaster position="top-right" richColors />

        {/* Yandex.Metrika */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=106867122','ym');
          ym(106867122,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript>
          <div><img src="https://mc.yandex.ru/watch/106867122" style={{position:'absolute',left:'-9999px'}} alt="" /></div>
        </noscript>

        {/* Cloudflare Turnstile */}
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
