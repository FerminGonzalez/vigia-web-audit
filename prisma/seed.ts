/**
 * prisma/seed.ts
 * -----------------------------------------------------------------------------
 * Datos de demostracion para desarrollo local.
 * Ejecutar con:  npx tsx prisma/seed.ts
 */
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const client = await prisma.client.upsert({
    where: { email: 'demo@tienda-panama.com' },
    update: {},
    create: {
      email: 'demo@tienda-panama.com',
      businessName: 'Tienda La Chorrera',
      sector: 'Comercio minorista',
      city: 'Panama',
      paymentProvider: 'stripe',
      paymentCustomerId: 'cus_demo_123',
      sites: {
        create: { url: 'https://example.com', label: 'Sitio principal', isActive: true },
      },
      subscription: {
        create: {
          provider: 'stripe',
          externalSubscriptionId: 'sub_demo_123',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { sites: true },
  });

  console.log(`✅ Cliente de demo listo: ${client.businessName} (${client.email})`);
  console.log(`   Sitio: ${client.sites[0]?.url}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
