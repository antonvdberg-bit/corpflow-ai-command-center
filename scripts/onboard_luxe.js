/**
 * Upsert demo tenant `luxe-maurice` in Postgres (`tenants` table).
 *
 *   TENANT_LUXE_MAURICE_PROJECT_ID (optional, default luxe-maurice) — stored as tenant_id
 *
 * Run: node scripts/onboard_luxe.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = String(process.env.TENANT_LUXE_MAURICE_PROJECT_ID || 'luxe-maurice').trim();
  const slug = 'luxe-maurice';

  await prisma.tenant.upsert({
    where: { slug },
    update: { name: 'Luxe Maurice', tenantId },
    create: {
      tenantId,
      slug,
      name: 'Luxe Maurice',
    },
  });
  console.log('Tenant upserted:', slug, tenantId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
