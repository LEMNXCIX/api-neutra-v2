import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ALL USER-TENANT RECORDS ---');
    const uts = await prisma.userTenant.findMany({
        include: {
            user: { select: { email: true, name: true } },
            tenant: { select: { slug: true, name: true } },
            role: { select: { name: true } }
        }
    });

    console.log(JSON.stringify(uts.map(ut => ({
        user: ut.user.email,
        tenant: ut.tenant.slug,
        role: ut.role.name
    })), null, 2));

    console.log('\n--- ALL USERS DUMP ---');
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
