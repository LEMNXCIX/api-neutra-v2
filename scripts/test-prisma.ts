import { prisma } from '@/config/db.config';

async function main() {
    try {
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected!');
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
