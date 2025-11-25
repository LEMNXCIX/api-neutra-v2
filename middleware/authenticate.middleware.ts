import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '@/types/rbac';

/**
 * Middleware to authenticate user via JWT token
 * Validates the token and populates req.user with decoded payload
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            errors: [{
                code: 'AUTH_001',
                message: 'Token is required for this operation'
            }]
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret as string) as JWTPayload;

        // Attach user info to request
        // Attach user info to request
        (req as any).user = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
        };

        next();
    } catch (error: any) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token',
            errors: [{
                code: 'AUTH_004',
                message: error.message,
                type: error.name
            }]
        });
    }
}
