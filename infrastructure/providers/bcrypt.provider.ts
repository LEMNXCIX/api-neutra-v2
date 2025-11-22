import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../core/providers/auth-providers.interface';

export class BcryptProvider implements IPasswordHasher {
    async hash(password: string): Promise<string> {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(password, salt);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
