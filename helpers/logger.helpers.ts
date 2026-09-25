import pino from "pino";
import config from "@/config/index.config";
import { isProduction } from "@/core/domain/constants";

export function createLoggerHelpers() {
    const isProd = isProduction(config.ENVIRONMENT);
    const transport = !isProd
        ? pino.transport({
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard" },
          })
        : undefined;
    const logger = pino(transport);

    return {
        info(payload: unknown) {
            logger.info(payload);
        },
        warn(payload: unknown) {
            logger.warn(payload);
        },
        error(payload: unknown) {
            logger.error(payload);
        },
    };
}

export default createLoggerHelpers;
