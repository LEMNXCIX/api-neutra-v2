import { NodemailerProvider } from '../infrastructure/providers/nodemailer.provider';

try {
    const provider = new NodemailerProvider();
    console.log('NodemailerProvider instantiated successfully');
} catch (error) {
    console.error('Error instantiating NodemailerProvider:', error);
    process.exit(1);
}
