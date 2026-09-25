import { PinoLoggerProvider } from "./pino-logger.provider";

/** Create an application logger owned by the active runtime. */
export function createLogger(): PinoLoggerProvider {
    return new PinoLoggerProvider();
}
