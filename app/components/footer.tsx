import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-foreground/40 text-xs">
          &copy; {new Date().getFullYear()} LookLikeme. Все права защищены.
        </p>
        <nav className="flex items-center gap-4 text-xs">
          <Link href="/terms" className="text-foreground/40 hover:text-gold transition-colors">
            Пользовательское соглашение
          </Link>
          <Link href="/privacy" className="text-foreground/40 hover:text-gold transition-colors">
            Политика конфиденциальности
          </Link>
          <a href="mailto:metaversa@yandex.ru" className="text-foreground/40 hover:text-gold transition-colors">
            Контакты
          </a>
        </nav>
      </div>
    </footer>
  );
}
