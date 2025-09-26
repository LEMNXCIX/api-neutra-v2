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

  return res.status(statusCode).json(result);
}

function deleteCookie(res: Response) {
  return res
    .cookie(
      'token',
      '',
      Object.assign({}, cookieOptions(), {
        expires: new Date(),
      })
    )
    .json({
      success: true,
      message: 'Se ha cerrado sesión correctamente',
    });
}

export = { authResponse, deleteCookie, providerResponse };
