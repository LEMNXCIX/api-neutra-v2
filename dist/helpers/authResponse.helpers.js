"use strict";
const config = require('../config/index.config');
const production = config.production;
const ENVIRONMENT = config.ENVIRONMENT;
const callbackURL = config.callbackURL;
const callbackURLDev = config.callbackURLDev;
function cookieOptions() {
    if (production || ENVIRONMENT === 'prod' || ENVIRONMENT === 'production') {
        return {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        };
    }
    return {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
    };
}
function authResponse(res, result, statusCode) {
    if (result.success) {
        const { token, ...data } = result;
        const opts = Object.assign({}, cookieOptions(), {
            expires: new Date(new Date().setDate(new Date().getDate() + 7)),
        });
        res.cookie('token', token, opts).json(data);
        return res;
    }
    return res.status(statusCode).json(result);
}
function providerResponse(res, result, statusCode) {
    if (result.success) {
        const { token, ...data } = result;
        const opts = Object.assign({}, cookieOptions(), {
            expires: new Date(new Date().setDate(new Date().getDate() + 7)),
        });
        const redirectTo = ENVIRONMENT === 'prod' || ENVIRONMENT === 'production'
            ? callbackURL || 'https://neutra.ec'
            : callbackURLDev || 'http://localhost:3000';
        return res.cookie('token', token, opts).redirect(redirectTo);
    }
    return res.status(statusCode).json(result);
}
function deleteCookie(res) {
    return res
        .cookie('token', '', Object.assign({}, cookieOptions(), {
        expires: new Date(),
    }))
        .json({
        success: true,
        message: 'Se ha cerrado sesión correctamente',
    });
}
module.exports = { authResponse, deleteCookie, providerResponse };
