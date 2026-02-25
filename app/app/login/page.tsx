"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 relative z-0">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-foreground">Look</span>
            <span className="text-gold">Like</span>
            <span className="text-foreground">me</span>
          </h1>
          <p className="text-foreground/60 mt-2">Войдите, чтобы создавать образы</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm text-center">
                {error === "OAuthAccountNotLinked"
                  ? "Этот email уже используется другим способом входа"
                  : `Ошибка при входе (${error}). Попробуйте снова.`}
              </p>
            </div>
          )}

          {/* Google */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-medium py-3 px-4 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Войти через Google
          </button>

          {/* Yandex */}
          <button
            onClick={() => signIn("yandex", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-[#FC3F1D] hover:bg-[#e63617] text-white font-medium py-3 px-4 rounded-lg transition-all mt-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm7.5 5.5V6.5h2.06c2.28 0 3.69 1.2 3.69 3.1 0 1.4-.75 2.47-2.09 2.94L16.25 17.5h-1.75l-2.84-4.62v4.62H10v0h-.5zM11.5 8v3.56h.56c1.31 0 2.06-.56 2.06-1.78 0-1.19-.75-1.78-2.06-1.78h-.56z"/>
            </svg>
            Войти через Яндекс
          </button>

          {/* VK — временно отключён */}
          {/* <button
            onClick={() => signIn("vk", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-[#0077FF] hover:bg-[#0066dd] text-white font-medium py-3 px-4 rounded-lg transition-all mt-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.364 1.259 2.177 1.815.616.422 1.084.33 1.084.33l2.178-.03s1.14-.071.599-.964c-.044-.073-.314-.661-1.618-1.869-1.366-1.264-1.183-1.06.462-3.246.999-1.33 1.398-2.142 1.273-2.49-.119-.333-.854-.245-.854-.245l-2.45.015s-.182-.025-.317.056c-.131.079-.216.262-.216.262s-.387 1.028-.903 1.903c-1.088 1.848-1.523 1.946-1.7 1.832-.413-.266-.31-1.07-.31-1.64 0-1.783.271-2.525-.525-2.717-.264-.064-.458-.106-1.133-.113-.867-.009-1.601.003-2.016.206-.276.135-.49.436-.36.453.161.021.526.098.72.363.249.341.24 1.108.24 1.108s.143 2.098-.334 2.358c-.327.18-.777-.186-1.74-1.854-.493-.855-.866-1.8-.866-1.8s-.072-.176-.2-.27c-.155-.115-.372-.152-.372-.152l-2.327.015s-.35.01-.478.162c-.115.135-.009.414-.009.414s1.815 4.248 3.87 6.389c1.884 1.963 4.024 1.834 4.024 1.834h.97z"/>
            </svg>
            Войти через ВКонтакте
          </button> */}

          <div className="mt-6 text-center">
            <p className="text-foreground/40 text-xs">
              Продолжая, вы соглашаетесь с{" "}
              <a href="/terms" className="text-gold hover:underline">
                условиями использования
              </a>
              {" "}и{" "}
              <a href="/privacy" className="text-gold hover:underline">
                политикой конфиденциальности
              </a>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <a href="/" className="text-foreground/60 hover:text-gold text-sm transition-colors">
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-gold">Загрузка...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
