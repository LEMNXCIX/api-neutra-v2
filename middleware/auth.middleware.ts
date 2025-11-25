import jwt from 'jsonwebtoken';
import config from '../config/index.config';
import { Request, Response, NextFunction } from 'express';

const { jwtSecret } = config;

function authValidation(role: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).neededRole = role;
    return validateToken(req, res, next);
  };
}

function validateToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'Se requiere de un token para este proceso',
    });
  }
  return verifyToken(token, req, res, next);
}

function verifyToken(token: any, req: Request, res: Response, next: NextFunction) {
  try {
    const decoded: any = jwt.verify(token, jwtSecret as string);
    delete decoded.iat;
    delete decoded.exp;
    (req as any).user = decoded;

    return validateRole(req, res, next);
  } catch (error: any) {
    return res.status(403).json({
      success: false,
      message: error.message,
      type: error.name,
    });
  }
}

function validateRole(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user.role >= (req as any).neededRole) {
    return next();
  }

  return res.status(403).json({
    success: false,
    messages: 'Permisos insuficientes. Necesitas un rol mayor',
  });
}

export default authValidation;
