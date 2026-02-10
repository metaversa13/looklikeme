"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookieConsent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4">
      <div className="max-w-2xl mx-auto glass-card rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-2xl">
        <p className="text-foreground/70 text-sm flex-1">
          Мы используем cookies для корректной работы сайта.{" "}
          <Link href="/privacy" className="text-gold hover:underline">
            Подробнее
          </Link>
        </p>
        <button
          onClick={accept}
          className="bg-gold hover:bg-gold-600 text-black font-semibold px-6 py-2 rounded-lg text-sm transition-all whitespace-nowrap"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
