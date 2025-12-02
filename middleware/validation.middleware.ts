import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import type { ErrorDetail } from '@/types/api-response';

export const validateDto = <T>(ctor: new () => T) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dto = plainToInstance(ctor, req.body);
    const errors = await validate(dto as object);
    if (errors.length > 0) {
      const details = errors.map((err: ValidationError) => ({
        code: 'VALIDATION_ERROR',
        message: Object.values(err.constraints || {})[0] || 'Invalid field',
        field: err.property,
        domain: 'validation',
      } as ErrorDetail));

      res.apiError(details, 'Validación fallida', 400);
      return;
    }
    (req as any).validatedBody = dto;  // Adjunta para uso downstream
    next();
  };
};

// Higher-order: compose multiple validators
export const composeValidators = (...validators: Array<(req: Request, res: Response, next: NextFunction) => void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const middleware = (index: number) => {
      if (index < validators.length) {
        validators[index](req, res, () => middleware(index + 1));
      } else {
        next();
      }
    };
    middleware(0);
  };
};