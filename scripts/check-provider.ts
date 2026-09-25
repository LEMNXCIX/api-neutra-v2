import { NodemailerProvider } from '../infrastructure/providers/nodemailer.provider';
import { PinoLoggerProvider } from '../infrastructure/providers/pino-logger.provider';

try {
    const provider = new NodemailerProvider(new PinoLoggerProvider());
    console.log('NodemailerProvider instantiated successfully');
} catch (error) {
    console.error('Error instantiating NodemailerProvider:', error);
    process.exit(1);
}
