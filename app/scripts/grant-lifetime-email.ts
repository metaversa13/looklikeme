import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantLifetimeByEmail(email: string) {
  try {
    // Находим пользователя по email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ Пользователь с email ${email} не найден.`);
      console.log('💡 Сначала войди под этим аккаунтом!');
      return;
    }

    // Даём Lifetime доступ
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionType: 'LIFETIME',
        lifetimeAccess: true,
        subscriptionEndDate: null,
      },
    });

    console.log('✅ Lifetime доступ предоставлен!');
    console.log(`👤 Пользователь: ${updated.name || updated.email}`);
    console.log(`📧 Email: ${updated.email}`);
    console.log(`💎 Подписка: ${updated.subscriptionType}`);
    console.log(`🎉 Пожизненный доступ: ${updated.lifetimeAccess ? 'Да' : 'Нет'}`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('❌ Укажите email: npx tsx scripts/grant-lifetime-email.ts your@email.com');
  process.exit(1);
}

grantLifetimeByEmail(email);
