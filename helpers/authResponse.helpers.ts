import { Response, CookieOptions } from 'express';
const config = require('../config/index.config');

const production: boolean = config.production;
const ENVIRONMENT: string = config.ENVIRONMENT;
const callbackURL: string | undefined = config.callbackURL;
const callbackURLDev: string | undefined = config.callbackURLDev;

function cookieOptions(): CookieOptions {
  if (production || ENVIRONMENT === 'prod' || ENVIRONMENT === 'production') {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    } as CookieOptions;
  }

  return {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
  } as CookieOptions;
}

function authResponse(res: Response, result: any, statusCode: number) {
  if (result && result.success) {
    const { token, ...data } = result;
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    const payload = {
      success: true,
      code: statusCode,
      message: result.message || '',
      data: Object.keys(data).length ? data : undefined,
    };

    res.cookie('token', token, opts).status(statusCode).json(payload);
    return res;
  }

  const payload = {
    success: false,
    code: statusCode,
    message: result && result.message ? result.message : (result || 'Error'),
    errors: result && result.errors ? result.errors : undefined,
  };

  return res.status(statusCode).json(payload);
}

function providerResponse(res: Response, result: any, statusCode: number) {
  if (result.success) {
    const { token, ...data } = result;
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    const redirectTo =
      ENVIRONMENT === 'prod' || ENVIRONMENT === 'production'
        ? callbackURL || 'https://neutra.ec'
        : callbackURLDev || 'http://localhost:3000';

    return res.cookie('token', token, opts).redirect(redirectTo);
  }

    // normalize error shape on provider fallback so middleware will not double-wrap
    const payload = {
      success: false,
      code: statusCode,
      message: result && result.message ? result.message : (result || 'Error'),
      errors: result && result.errors ? result.errors : undefined,
    };

    return res.status(statusCode).json(payload);
}

function deleteCookie(res: Response) {
  const payload = {
    success: true,
    code: 200,
    message: 'Se ha cerrado sesión correctamente',
  };

  return res
    .cookie(
      'token',
      '',
      Object.assign({}, cookieOptions(), {
        expires: new Date(),
      })
    )
    .status(200)
    .json(payload);
}

export = { authResponse, deleteCookie, providerResponse };
