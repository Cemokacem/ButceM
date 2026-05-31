import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed default categories
  const expenseCategories = [
    { name: 'Market', type: 'EXPENSE', icon: 'shopping-cart', color: '#10B981' },
    { name: 'Yemek', type: 'EXPENSE', icon: 'utensils', color: '#F59E0B' },
    { name: 'Ulaşım', type: 'EXPENSE', icon: 'car', color: '#3B82F6' },
    { name: 'Fatura', type: 'EXPENSE', icon: 'file-text', color: '#EF4444' },
    { name: 'Sağlık', type: 'EXPENSE', icon: 'heart', color: '#EC4899' },
    { name: 'Eğitim', type: 'EXPENSE', icon: 'book', color: '#8B5CF6' },
    { name: 'Giyim', type: 'EXPENSE', icon: 'shirt', color: '#06B6D4' },
    { name: 'Teknoloji', type: 'EXPENSE', icon: 'laptop', color: '#6366F1' },
    { name: 'Ev', type: 'EXPENSE', icon: 'home', color: '#84CC16' },
    { name: 'Eğlence', type: 'EXPENSE', icon: 'music', color: '#F97316' },
    { name: 'Diğer Gider', type: 'EXPENSE', icon: 'tag', color: '#94A3B8' },
  ];

  const incomeCategories = [
    { name: 'Maaş', type: 'INCOME', icon: 'briefcase', color: '#10B981' },
    { name: 'Serbest Çalışma', type: 'INCOME', icon: 'laptop', color: '#3B82F6' },
    { name: 'Yatırım', type: 'INCOME', icon: 'trending-up', color: '#8B5CF6' },
    { name: 'Kira Geliri', type: 'INCOME', icon: 'home', color: '#F59E0B' },
    { name: 'Diğer Gelir', type: 'INCOME', icon: 'tag', color: '#94A3B8' },
  ];

  for (const cat of [...expenseCategories, ...incomeCategories]) {
    await prisma.category.upsert({
      where: { id: `default-${cat.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `default-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      },
    });
  }

  // Seed default accounts
  const defaultAccounts = [
    { id: 'default-nakit', name: 'Nakit', type: 'CASH', balance: 0, color: '#10B981', icon: 'banknote' },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: {},
      create: acc,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
