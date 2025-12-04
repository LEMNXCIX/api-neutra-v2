import { Request, Response, NextFunction } from 'express';
import { ApiResponse, StandardResponse, AppError, ErrorDetail, SystemErrorCodes } from '@/types/api-response';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

const logger = new PinoLoggerProvider();

declare global {
  namespace Express {
    interface Response {
      apiSuccess: (data?: any, message?: string, statusCode?: number) => Response;
      apiError: (err: any, message?: string, statusCode?: number) => Response;
    }
  }
}

function makeTraceId(req: Request) {
  return `${req.method}-${req.path}-${Date.now()}`;
}

export default function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = (req as any).traceId || makeTraceId(req);
  (req as any).traceId = traceId;

  const originalJson = res.json.bind(res);

  res.json = function (body?: any) {
    // Avoid double wrapping if it's already a StandardResponse
    if (body && typeof body === 'object' && 'meta' in body && 'statusCode' in body) {
      logger.logResponse({ statusCode: body.statusCode, body });
      return originalJson(body);
    }

    // Transform legacy/service payloads to StandardResponse
    let statusCode = res.statusCode || 200;
    let message = '';
    let data = body;
    let errors: ErrorDetail[] | undefined = undefined;
    let success = statusCode >= 200 && statusCode < 300;

    let pagination: any = undefined;

    if (body && typeof body === 'object') {
      // Check for legacy service result shape: { success, code, message, data, errors }
      if ('success' in body || 'code' in body) {
        success = body.success ?? success;
        statusCode = body.code ?? statusCode;
        message = body.message ?? message;
        data = body.data;
        pagination = body.pagination; // Extract pagination

        if (body.errors || body.errorDetails) {
          errors = normalizeErrors(body.errors || body.errorDetails);
        }
      }
      // Check for nested data shape: { data: { success, code, ... } }
      else if (body.data && typeof body.data === 'object' && ('success' in body.data || 'code' in body.data)) {
        success = body.data.success ?? success;
        statusCode = body.data.code ?? statusCode;
        message = body.data.message ?? message;
        data = body.data.data;
        pagination = body.data.pagination; // Extract pagination
        if (body.data.errors || body.data.errorDetails) {
          errors = normalizeErrors(body.data.errors || body.data.errorDetails);
        }
      }
    }

    const response: StandardResponse = {
      success,
      statusCode,
      message,
      data,
      errors,
      pagination,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    };

    // Sync HTTP status code
    if (res.statusCode !== statusCode) {
      res.status(statusCode);
    }

    logger.logResponse({ statusCode, body: response });

    return originalJson(response);
  } as any;

  res.apiSuccess = function (data?: any, message: string = 'OK', statusCode: number = 200) {
    const response = ApiResponse.success(data, message, statusCode, traceId);
    logger.logResponse({ statusCode, body: response });
    res.status(statusCode).json(response);
    return res;
  };

  res.apiError = function (err: any, message: string = 'Error', statusCode: number = 500) {
    let finalMessage = message;
    let finalStatusCode = statusCode;
    let finalErrors: ErrorDetail[] = [];

    if (err instanceof AppError) {
      finalMessage = err.message || message;
      finalStatusCode = err.statusCode;
      finalErrors = err.details || [];
    } else if (err instanceof Error) {
      finalMessage = err.message || message;
      finalErrors = [{
        code: SystemErrorCodes.INTERNAL_SERVER_ERROR,
        message: err.message,
        metadata: process.env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
      }];
    } else if (typeof err === 'string') {
      finalErrors = [{
        code: SystemErrorCodes.UNKNOWN_ERROR,
        message: err
      }];
    } else if (Array.isArray(err)) {
      finalErrors = normalizeErrors(err);
    } else if (typeof err === 'object') {
      finalErrors = normalizeErrors([err]);
    }

    const response = ApiResponse.error(finalMessage, finalErrors, finalStatusCode, traceId);
    logger.error('API Error Response', err, { traceId, response });
    res.status(finalStatusCode).json(response);
    return res;
  };

  next();
}

function normalizeErrors(errors: any): ErrorDetail[] {
  if (!Array.isArray(errors)) {
    errors = [errors];
  }
  return errors.map((e: any) => {
    if (typeof e === 'string') {
      return { code: SystemErrorCodes.UNKNOWN_ERROR, message: e };
    }
    if (e && typeof e === 'object') {
      return {
        code: e.code || SystemErrorCodes.UNKNOWN_ERROR,
        message: e.message || 'Unknown error',
        field: e.field,
        domain: e.domain,
        metadata: e.metadata
      };
    }
    return { code: 'UNKNOWN_ERROR', message: String(e) };
  });
}
