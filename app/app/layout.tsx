import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { ReferralHandler } from "@/components/referral-handler";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "LookLikeme - AI Fashion Style Generator",
  description: "Создайте свой идеальный модный образ с помощью искусственного интеллекта",
  keywords: ["fashion", "AI", "style", "outfit", "generator", "мода", "стиль"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <SessionProvider>
            <ReferralHandler />
            {children}
          </SessionProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
