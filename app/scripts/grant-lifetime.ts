import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantLifetimeToFirstUser() {
  try {
    // Находим первого пользователя (создателя приложения)
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      console.log('❌ Пользователи не найдены. Сначала зарегистрируйся!');
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

grantLifetimeToFirstUser();
