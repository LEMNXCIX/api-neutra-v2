import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { JWTPayload } from '@/types/rbac';

export class JwtProvider implements ITokenGenerator {
    private secret: string;

    constructor() {
        this.secret = config.jwtSecret || 'default_secret';
    }

    generate(payload: any): string {
        // Ensure we include complete role information with permissions
        const tokenPayload: JWTPayload = {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: {
                id: payload.role?.id || '',
                name: payload.role?.name || 'USER',
                level: payload.role?.level || 1,
                permissions: payload.role?.permissions?.map((p: any) =>
                    typeof p === 'string' ? p : p.name
                ) || []
            }
        };

        return jwt.sign(tokenPayload, this.secret, { expiresIn: '7d' });
    }

    verify(token: string): JWTPayload {
        return jwt.verify(token, this.secret) as JWTPayload;
    }
}
