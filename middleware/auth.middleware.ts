const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/index.config');

function authValidation(role: number) {
  return (req: any, res: any, next: any) => {
    req.neededRole = role;
    return validateToken(req, res, next);
  };
}

function validateToken(req: any, res: any, next: any) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'Se requiere de un token para este proceso',
    });
  }
  return verifyToken(token, req, res, next);
}

function verifyToken(token: any, req: any, res: any, next: any) {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    delete decoded.iat;
    delete decoded.exp;
    req.user = decoded;

    return validateRole(req, res, next);
  } catch ({ message, name }: any) {
    return res.status(403).json({
      success: false,
      message,
      type: name,
    });
  }
}

function validateRole(req: any, res: any, next: any) {
  if (req.user.role >= req.neededRole) {
    return next();
  }

  return res.status(403).json({
    success: false,
    messages: 'Permisos insuficientes. Necesitas un rol mayor',
  });
}

export = authValidation;
