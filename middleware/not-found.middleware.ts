import { Request, Response, NextFunction } from 'express';
import { ResourceErrorCodes } from '../types/error-codes';

/**
 * Middleware to handle 404 Not Found errors for non-existent routes
 * Should be placed after all other route handlers
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    res.apiError(
        `Route not found: ${req.method} ${req.originalUrl}`,
        'Resource not found',
        404
    );

    // We can also manually structure the error if apiError doesn't support custom codes directly yet
    // But since apiError uses normalizeErrors which defaults to UNKNOWN_ERROR for strings,
    // we might want to pass an object to specify the code.

    /* 
    // Alternative implementation if apiError needs object for specific code:
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: 'Resource not found',
        errors: [{
            code: ResourceErrorCodes.ROUTE_NOT_FOUND,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            domain: 'resource'
        }],
        meta: {
            timestamp: new Date().toISOString(),
            traceId: (req as any).traceId
        }
    });
    */
}

/**
 * Enhanced version that uses the specific error code
 */
export function notFoundHandlerEnhanced(req: Request, res: Response, next: NextFunction) {
    const error = {
        code: ResourceErrorCodes.ROUTE_NOT_FOUND,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        domain: 'resource'
    };

    res.apiError(error, 'Resource not found', 404);
}
