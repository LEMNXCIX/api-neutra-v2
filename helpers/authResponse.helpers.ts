import { Response, CookieOptions } from 'express';
import config from '@/config/index.config';

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

export function authResponse(res: Response, result: any, statusCode: number) {
  const code = result && typeof result.code === 'number' ? result.code : statusCode;

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    // Extract token from result data
    let token: string | undefined;
    let data: any = result.data;

    if (result.token) {
      token = result.token;
    } else if (result.data && result.data.token) {
      token = result.data.token;
      // Clean up token from data if it exists there to avoid redundancy
      const { token: _, ...rest } = result.data;
      data = Object.keys(rest).length ? rest : undefined;
      // Unwrap user object if it's the only thing left
      if (data && data.user && Object.keys(data).length === 1) {
        data = data.user;
      }
    }

    if (token) {
      res.cookie('token', token, opts);
    }

    return res.apiSuccess(data, result.message, code);
  }

  return res.apiError(result.errors || result.message || result, result.message || 'Error', code);
}

export function providerResponse(res: Response, result: any, statusCode: number) {
  const code = result && typeof result.code === 'number' ? result.code : statusCode;

  let token: string | undefined;
  if (result && result.token) token = result.token;
  else if (result && result.data && result.data.token) token = result.data.token;
  else if (result && result.data && result.data.data && result.data.data.token) token = result.data.data.token;

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    const redirectTo =
      ENVIRONMENT === 'prod' || ENVIRONMENT === 'production'
        ? callbackURL || 'https://neutra.ec'
        : callbackURLDev || 'http://localhost:3000';

    if (token) {
      res.cookie('token', token, opts);
    }

    return res.redirect(redirectTo);
  }

  return res.apiError(result.errors || result.message || result, result.message || 'Error', code);
}

export function deleteCookie(res: Response) {
  return res
    .cookie(
      'token',
      '',
      Object.assign({}, cookieOptions(), {
        expires: new Date(),
      })
    )
    .apiSuccess(undefined, 'Se ha cerrado sesión correctamente', 200);
}

export default { authResponse, deleteCookie, providerResponse };
