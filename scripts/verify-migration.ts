import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const cartCount = await prisma.cart.count();
    const orderCount = await prisma.order.count();

    console.log('--- PostgreSQL Record Counts ---');
    console.log(`Users: ${userCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Carts: ${cartCount}`);
    console.log(`Orders: ${orderCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
