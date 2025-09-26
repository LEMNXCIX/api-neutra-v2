"use strict";
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/index.config');
function authValidation(role) {
    return (req, res, next) => {
        req.neededRole = role;
        return validateToken(req, res, next);
    };
}
function validateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'Se requiere de un token para este proceso',
        });
    }
    return verifyToken(token, req, res, next);
}
function verifyToken(token, req, res, next) {
    try {
        const decoded = jwt.verify(token, jwtSecret);
        delete decoded.iat;
        delete decoded.exp;
        req.user = decoded;
        return validateRole(req, res, next);
    }
    catch ({ message, name }) {
        return res.status(403).json({
            success: false,
            message,
            type: name,
        });
    }
}
function validateRole(req, res, next) {
    if (req.user.role >= req.neededRole) {
        return next();
    }
    return res.status(403).json({
        success: false,
        messages: 'Permisos insuficientes. Necesitas un rol mayor',
    });
}
module.exports = authValidation;
