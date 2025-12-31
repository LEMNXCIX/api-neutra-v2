import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const appointments = await prisma.appointment.findMany({
        include: {
            tenant: true
        }
    });

    console.log(`Found ${appointments.length} appointments:`);
    appointments.forEach(a => {
        console.log(`ID: ${a.id} | Tenant: ${a.tenant?.slug} | Status: ${a.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
