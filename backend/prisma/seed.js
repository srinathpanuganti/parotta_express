const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  // Load corporate menu JSON, prefer env override; fallback to local seed-data
  let data;
  const tryPaths = [];
  if (process.env.MENU_JSON_PATH) {
    tryPaths.push(process.env.MENU_JSON_PATH);
  }
  tryPaths.push(path.resolve(__dirname, '../seed-data/corporateMenuData.json'));
  tryPaths.push(path.resolve(__dirname, '../../frontend/src/data/corporateMenuData.json'));

  let found = null;
  for (const p of tryPaths) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      data = JSON.parse(raw);
      found = p;
      break;
    } catch (_) {}
  }
  if (!data) {
    // eslint-disable-next-line no-console
    console.warn('[seed] No menu JSON found; skipping menu seed');
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[seed] Seeding menu from: ${found}`);

  // Upsert categories and items with stable IDs from JSON
  for (const cat of data.categories || []) {
    await prisma.menuCategory.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description || null,
      },
      update: {
        name: cat.name,
        description: cat.description || null,
      },
    });

    for (const item of cat.items || []) {
      await prisma.menuItem.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          categoryId: cat.id,
        },
        update: {
          name: item.name,
          price: Number(item.price),
          categoryId: cat.id,
        },
      });
    }
  }
}

if (require.main === module) {
  seed()
    .then(async () => {
      // eslint-disable-next-line no-console
      console.log('Seed completed');
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { seed };
