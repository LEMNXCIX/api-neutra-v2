import pino from 'pino';
const { ENVIRONMENT } = require('../config/index.config');

// In development we prefer pretty printing for readability
const isProd = ENVIRONMENT === 'prod' || ENVIRONMENT === 'production';

const transport = !isProd
  ? pino.transport({
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    })
  : undefined;

const logger = pino(transport);

export function info(payload: any) {
  logger.info(payload);
}

export function warn(payload: any) {
  logger.warn(payload);
}

export function error(payload: any) {
  logger.error(payload);
}

export default { info, warn, error };
