
import { Request, Response, NextFunction } from 'express';
import { AppError, ApiResponse, ErrorDetail } from '@/types/api-response';
import { SystemErrorCodes, getHttpStatusFromErrorCode } from '@/types/error-codes';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

const logger = new PinoLoggerProvider();

/**
 * Global error handling middleware.
 */
export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const traceId = (req as any).traceId;
  
  let statusCode = 500;
  let message = 'An unexpected error occurred';
  let errors: ErrorDetail[] = [];

  if (err instanceof AppError) {
    statusCode = getHttpStatusFromErrorCode(err.code);
    message = err.message;
    errors = err.details || [{
      code: err.code || SystemErrorCodes.INTERNAL_SERVER_ERROR,
      message: err.message
    }];
  } else if (err instanceof Error) {
    // Standard JS error
    message = err.message;
    errors = [{
      code: SystemErrorCodes.INTERNAL_SERVER_ERROR,
      message: err.message,
      metadata: process.env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
    }];
  } else if (typeof err === 'string') {
    message = err;
    errors = [{
      code: SystemErrorCodes.UNKNOWN_ERROR,
      message: err
    }];
  }

  // Log the error
  logger.error('Error handled by global middleware', err, { traceId, statusCode });

  // Return standardized response
  const response = ApiResponse.error(message, errors, statusCode, traceId);
  return res.status(statusCode).json(response);
};
