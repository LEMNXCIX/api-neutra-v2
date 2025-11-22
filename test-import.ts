import pino from 'pino';
try {
    const logger = pino();
    logger.info('Pino works');
} catch (e) {
    console.error(e);
}
