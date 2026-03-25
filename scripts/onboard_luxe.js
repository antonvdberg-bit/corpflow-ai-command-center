const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const baserowTableId = process.env.TENANT_LUXE_MAURICE_BASEROW_TABLE_ID;
  const notificationId = process.env.TENANT_LUXE_MAURICE_NOTIFICATION_ID;

  if (!baserowTableId) {
    throw new Error("TENANT_LUXE_MAURICE_BASEROW_TABLE_ID is not configured");
  }
  if (!notificationId) {
    throw new Error("TENANT_LUXE_MAURICE_NOTIFICATION_ID is not configured");
  }

  const luxeMaurice = await prisma.tenant.upsert({
    where: { slug: 'luxe-maurice' },
    update: {},
    create: {
      slug: 'luxe-maurice',
      name: 'Luxe Maurice',
      baserowTableId: baserowTableId,
      aiSystemPrompt: "You are the Elite Concierge for Luxe Maurice. Your tone is sophisticated, knowledgeable, and discreet. You analyze luxury real estate inquiries in Mauritius, focusing on HNW indicators (investment residency, IRS/RES/PDS schemes). Your goal is to provide a vetting dossier for the Luxe Maurice directors.",
      notificationId: notificationId
    },
  });
  console.log('Tenant Onboarded: ', luxeMaurice.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
