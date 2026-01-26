import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Форматирование даты
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Форматирование относительного времени (например, "2 часа назад")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'только что';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин назад`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч назад`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} дн назад`;

  return formatDate(d);
}

/**
 * Проверка истёк ли срок подписки
 */
export function isSubscriptionExpired(endDate: Date | string | null): boolean {
  if (!endDate) return true;
  const date = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return date < new Date();
}

/**
 * Проверка доступа к premium функции
 */
export function hasPremiumAccess(
  subscriptionType: 'FREE' | 'PREMIUM' | 'LIFETIME',
  lifetimeAccess: boolean,
  subscriptionEndDate: Date | string | null
): boolean {
  if (lifetimeAccess) return true;
  if (subscriptionType === 'FREE') return false;
  if (subscriptionType === 'LIFETIME') return true;
  if (subscriptionType === 'PREMIUM') {
    return !isSubscriptionExpired(subscriptionEndDate);
  }
  return false;
}
