const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const luxeMaurice = await prisma.tenant.upsert({
    where: { slug: 'luxe-maurice' },
    update: {},
    create: {
      slug: 'luxe-maurice',
      name: 'Luxe Maurice',
      baserowTableId: 'YOUR_BASEROW_TABLE_ID', // Replace with their specific Table ID
      aiSystemPrompt: "You are the Elite Concierge for Luxe Maurice. Your tone is sophisticated, knowledgeable, and discreet. You analyze luxury real estate inquiries in Mauritius, focusing on HNW indicators (investment residency, IRS/RES/PDS schemes). Your goal is to provide a vetting dossier for the Luxe Maurice directors.",
      notificationId: 'CLIENT_CHAT_ID' // The specific Telegram ID for Luxe Maurice staff
    },
  });
  console.log('Tenant Onboarded: ', luxeMaurice.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
