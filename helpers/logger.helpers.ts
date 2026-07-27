import pino from "pino";
import config from "@/config/index.config";
import { isProduction } from "@/core/domain/constants";

const isProd = isProduction(config.ENVIRONMENT);

const transport = !isProd
    ? pino.transport({
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
      })
    : undefined;

const logger = pino(transport);

export function info(payload: unknown) {
    logger.info(payload);
}

export function warn(payload: unknown) {
    logger.warn(payload);
}

export function error(payload: unknown) {
    logger.error(payload);
}

export default { info, warn, error };
