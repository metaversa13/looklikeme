import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — LookLikeme",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground pt-20 px-4 pb-10 relative z-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gold mb-8">
            Политика конфиденциальности
          </h1>

          <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 text-foreground/80 text-sm leading-relaxed">
            <p className="text-foreground/50 text-xs">
              Дата вступления в силу: 10 февраля 2026 г.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">1. Общие положения</h2>
              <p>
                Настоящая Политика конфиденциальности (далее — Политика) определяет порядок
                обработки и защиты персональных данных пользователей сервиса LookLikeme (далее — Сервис),
                принадлежащего самозанятому Шевченко Евгений Викторович (далее — Оператор).
              </p>
              <p className="mt-2">
                Политика разработана в соответствии с Федеральным законом от 27.07.2006 N 152-ФЗ
                «О персональных данных».
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">2. Какие данные мы собираем</h2>

              <h3 className="font-medium text-foreground mt-3 mb-2">Данные при авторизации (OAuth):</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Имя и фамилия;</li>
                <li>Адрес электронной почты;</li>
                <li>Фотография профиля (аватар);</li>
                <li>Идентификатор аккаунта в сервисе авторизации (Google, Яндекс, ВКонтакте).</li>
              </ul>

              <h3 className="font-medium text-foreground mt-3 mb-2">Данные при использовании Сервиса:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Загруженные фотографии (для генерации образов);</li>
                <li>Сгенерированные AI-изображения;</li>
                <li>Выбранные стили, локации и настройки генерации;</li>
                <li>История обращений к AI-стилисту.</li>
              </ul>

              <h3 className="font-medium text-foreground mt-3 mb-2">Технические данные:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>IP-адрес;</li>
                <li>Тип и версия браузера;</li>
                <li>Файлы cookies;</li>
                <li>Данные об использовании Сервиса (аналитика).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">3. Цели обработки данных</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Авторизация и идентификация Пользователя;</li>
                <li>Генерация модных образов с помощью AI;</li>
                <li>Обработка платежей за подписки;</li>
                <li>Предоставление персональных рекомендаций от AI-стилиста;</li>
                <li>Улучшение качества Сервиса;</li>
                <li>Связь с Пользователем по вопросам использования Сервиса;</li>
                <li>Выполнение требований законодательства РФ.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">4. Хранение данных</h2>
              <p>
                Персональные данные хранятся на защищённых серверах. Загруженные и сгенерированные
                изображения хранятся в облачном хранилище (S3-совместимое).
              </p>
              <p className="mt-2">
                Для пользователей бесплатного тарифа сгенерированные образы хранятся 30 дней.
                Для пользователей платных тарифов — бессрочно.
              </p>
              <p className="mt-2">
                При удалении аккаунта все персональные данные и загруженные изображения удаляются.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">5. Cookies</h2>
              <p>
                Сервис использует cookies для:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Поддержания сессии авторизации;</li>
                <li>Сохранения пользовательских предпочтений;</li>
                <li>Обеспечения безопасности (Cloudflare Turnstile).</li>
              </ul>
              <p className="mt-2">
                Пользователь может отключить cookies в настройках браузера, однако это может
                повлиять на функциональность Сервиса.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">6. Передача данных третьим лицам</h2>
              <p>
                Мы можем передавать данные следующим третьим лицам исключительно для обеспечения
                работы Сервиса:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Google, Яндекс, ВКонтакте</strong> — для авторизации через OAuth;</li>
                <li><strong>Replicate (Black Forest Labs)</strong> — для AI-генерации образов (передаётся загруженное фото);</li>
                <li><strong>ЮKassa (НКО «ЮМани»)</strong> — для обработки платежей;</li>
                <li><strong>Cloudflare</strong> — для защиты от ботов и DDoS-атак.</li>
              </ul>
              <p className="mt-2">
                Мы не продаём и не передаём персональные данные в рекламных или маркетинговых целях.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">7. Права пользователя</h2>
              <p>
                Пользователь имеет право:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Получить информацию об обрабатываемых персональных данных;</li>
                <li>Потребовать уточнения, блокирования или уничтожения персональных данных;</li>
                <li>Удалить свой аккаунт и все связанные данные;</li>
                <li>Отозвать согласие на обработку персональных данных.</li>
              </ul>
              <p className="mt-2">
                Для реализации своих прав свяжитесь с нами по email: 79289824228@ya.ru.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">8. Защита данных</h2>
              <p>
                Оператор принимает необходимые организационные и технические меры для защиты
                персональных данных от несанкционированного доступа, изменения, раскрытия
                или уничтожения, включая:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Шифрование данных при передаче (HTTPS/TLS);</li>
                <li>Ограничение доступа к персональным данным;</li>
                <li>Регулярное обновление программного обеспечения.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">9. Изменение Политики</h2>
              <p>
                Оператор вправе вносить изменения в настоящую Политику. Актуальная версия
                всегда доступна на данной странице. Продолжение использования Сервиса после
                внесения изменений означает согласие с обновлённой Политикой.
              </p>
            </section>

            <section className="border-t border-border pt-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Контактные данные</h2>
              <p>Самозанятый: Шевченко Евгений Викторович</p>
              <p>ИНН: 263119210082</p>
              <p>Email: 79289824228@ya.ru</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
