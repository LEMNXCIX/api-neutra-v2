import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { JWTPayload } from '@/types/rbac';
import { JWT_CONSTANTS } from '@/core/domain/constants';

export class JwtProvider implements ITokenGenerator {
    private secret: string;

    constructor() {
        if (!config.jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        this.secret = config.jwtSecret;
    }

    generate(payload: any): string {
        // Ensure we include complete role information (without permissions)
        const tokenPayload: JWTPayload = {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: {
                id: payload.role?.id || '',
                name: payload.role?.name || 'USER',
                level: payload.role?.level || 1
            }
        };

        return jwt.sign(tokenPayload, this.secret, {
            expiresIn: JWT_CONSTANTS.EXPIRATION,
            algorithm: JWT_CONSTANTS.ALGORITHM
        });
    }

    verify(token: string): JWTPayload {
        return jwt.verify(token, this.secret, {
            algorithms: [JWT_CONSTANTS.ALGORITHM]
        }) as JWTPayload;
    }
}
