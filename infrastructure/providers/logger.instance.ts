import { PinoLoggerProvider } from "./pino-logger.provider";

/** Shared application-wide logger instance. */
export const logger = new PinoLoggerProvider();
