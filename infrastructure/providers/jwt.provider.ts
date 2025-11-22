import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { ITokenGenerator } from '@/core/providers/auth-providers.interface';

export class JwtProvider implements ITokenGenerator {
    private secret: string;

    constructor() {
        this.secret = config.jwtSecret || 'default_secret';
    }

    generate(payload: any): string {
        return jwt.sign(payload, this.secret, { expiresIn: '7d' });
    }

    verify(token: string): any {
        return jwt.verify(token, this.secret);
    }
}
