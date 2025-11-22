import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if ('slideshow' in prisma) {
    console.log('SUCCESS: slideshow model found');
} else {
    console.error('FAILURE: slideshow model NOT found');
    console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
}
