import { Request, Response, NextFunction } from 'express';
import { info, error as logError } from '../helpers/logger.helpers';

// Standard response shape used by the API
type ApiPayload = {
  success: boolean;
  code: number; // http status code
  message?: string;
  data?: any;
  errors?: any;
  warnings?: any;
  traceId?: string;
};

declare global {
  namespace Express {
    interface Response {
      apiSuccess: (data?: any, message?: string, code?: number) => Response;
      apiError: (err: any, message?: string, code?: number) => Response;
    }
  }
}

function makeTraceId(req: Request) {
  // Lightweight trace id: method-path-timestamp
  return `${req.method}-${req.path}-${Date.now()}`;
}

export default function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = makeTraceId(req);

  // Monkey-patch res.json so existing handlers that call res.json() still return
  // the standardized API shape and are logged.
  const originalJson = res.json.bind(res);
  res.json = function (body?: any) {
    // If body already follows our ApiPayload shape, return as-is
    if (body && typeof body === 'object' && 'success' in body && 'code' in body) {
      info({ route: req.originalUrl, method: req.method, traceId, payload: body });
      return originalJson(body);
    }

    // Normalize and promote inner payload fields if present to avoid double-wrapping.
    let promotedSuccess: boolean | undefined = undefined;
    let promotedMessage: string | undefined = undefined;
    let promotedCode: number | undefined = undefined;
    let dataField: any = body;

    if (body && typeof body === 'object') {
      // If the handler returned an object like { success, message, code, data }
      if ('success' in body || 'message' in body || 'code' in body) {
        promotedSuccess = body.success;
        promotedMessage = body.message;
        promotedCode = body.code;
        dataField = 'data' in body ? body.data : (() => {
          const clone = { ...body };
          delete clone.success; delete clone.message; delete clone.code; delete clone.data;
          return Object.keys(clone).length ? clone : undefined;
        })();
      }

      // If the handler returned something like { data: { success, message, ... } }
      if (!promotedSuccess && body.data && typeof body.data === 'object' && ('success' in body.data || 'message' in body.data || 'code' in body.data)) {
        promotedSuccess = body.data.success;
        promotedMessage = body.data.message;
        promotedCode = body.data.code;
        dataField = 'data' in body.data ? body.data.data : (() => {
          const clone = { ...body.data };
          delete clone.success; delete clone.message; delete clone.code; delete clone.data;
          return Object.keys(clone).length ? clone : undefined;
        })();
      }
    }

    // Compose final payload
    const payload: ApiPayload = {
      success: typeof promotedSuccess === 'boolean' ? promotedSuccess : true,
      code: promotedCode || res.statusCode || 200,
      message: promotedMessage || '',
      data: dataField,
      traceId,
    };
    info({ route: req.originalUrl, method: req.method, traceId, payload });
    // ensure status code is present
    res.status(payload.code);
    return originalJson(payload);
  } as any;

  res.apiSuccess = function (data?: any, message?: string, code: number = 200) {
    const payload: ApiPayload = {
      success: true,
      code,
      message: message || 'OK',
      data,
      traceId,
    };
    info({ route: req.originalUrl, method: req.method, traceId, payload });
    res.status(code).json(payload);
    return res;
  };

  res.apiError = function (err: any, message?: string, code: number = 500) {
    const payload: ApiPayload = {
      success: false,
      code,
      message: message || 'Error',
      errors: err && err.message ? err.message : err,
      traceId,
    };
    logError({ route: req.originalUrl, method: req.method, traceId, err: payload });
    res.status(code).json(payload);
    return res;
  };

  // attach traceId for downstream handlers
  (req as any).traceId = traceId;
  next();
}
