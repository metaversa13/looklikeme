"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold tracking-tight">
          <span className="text-foreground">Look</span>
          <span className="text-gold">Like</span>
          <span className="text-foreground">me</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/generate" className="text-foreground/70 hover:text-gold transition-colors">
            Создать образ
          </Link>
          <Link href="/stylist" className="text-foreground/70 hover:text-gold transition-colors">
            AI Стилист
          </Link>
          {session && (
            <Link href="/gallery" className="text-foreground/70 hover:text-gold transition-colors">
              Избранное
            </Link>
          )}
          <Link href="/referral" className="text-foreground/70 hover:text-gold transition-colors">
            Пригласить друга
          </Link>
          <Link href="/pricing" className="text-foreground/70 hover:text-gold transition-colors">
            Тарифы
          </Link>
        </nav>

        {/* Theme Toggle + Auth */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 transition-colors text-lg"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-gold" strokeWidth={1.5} /> : <Moon className="w-5 h-5 text-gold" strokeWidth={1.5} />}
          </button>
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-foreground/10 animate-pulse" />
          ) : session ? (
            <div className="flex items-center gap-3">
              {/* Subscription Badge */}
              {session.user.subscriptionType !== "FREE" && (
                <span className="hidden sm:inline-flex premium-badge">
                  {session.user.subscriptionType === "LIFETIME" ? "Lifetime" : "Premium"}
                </span>
              )}

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-2">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Avatar"}
                      width={36}
                      height={36}
                      className="rounded-full border-2 border-foreground/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-black font-semibold">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </button>

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 z-[60] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="glass-card rounded-lg py-2 mt-2">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-foreground text-sm font-medium truncate">
                        {session.user.name}
                      </p>
                      <p className="text-foreground/50 text-xs truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-foreground/70 hover:text-gold hover:bg-foreground/5 transition-colors"
                    >
                      Мой профиль
                    </Link>
                    <Link
                      href="/gallery"
                      className="block px-4 py-2 text-foreground/70 hover:text-gold hover:bg-foreground/5 transition-colors"
                    >
                      Избранное
                    </Link>
                    <Link
                      href="/referral"
                      className="block px-4 py-2 text-foreground/70 hover:text-gold hover:bg-foreground/5 transition-colors"
                    >
                      Пригласить друга
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-foreground/5 transition-colors"
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-gold hover:bg-gold-600 text-black font-semibold px-4 py-2 rounded-lg btn-gold-hover"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
