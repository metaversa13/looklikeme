"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, Suspense } from "react";

function ReferralHandlerInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Сохраняем реферальный код в localStorage при первом визите
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, [searchParams]);

  // После авторизации — применяем реферальный код
  useEffect(() => {
    if (!session?.user?.id) return;

    const code = localStorage.getItem("referralCode");
    if (!code) return;

    // Отправляем код на сервер
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          localStorage.removeItem("referralCode");
        }
        // Если ошибка "уже использовали" — тоже удаляем из localStorage
        if (data.error && data.error.includes("уже использовали")) {
          localStorage.removeItem("referralCode");
        }
      })
      .catch(() => {});
  }, [session]);

  return null;
}

export function ReferralHandler() {
  return (
    <Suspense fallback={null}>
      <ReferralHandlerInner />
    </Suspense>
  );
}
