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
  // Prefer explicit code from result when provided
  const code = result && typeof result.code === 'number' ? result.code : statusCode;

  // Helper to safely extract token and data from either legacy or new result shapes
  const extractAuthPayload = (r: any) => {
    // direct token on result (legacy)
    if (r && r.token) {
      const { token, ...rest } = r;
      return { token, data: Object.keys(rest).length ? rest : undefined };
    }

    // token inside result.data (new shape)
    if (r && r.data && typeof r.data === 'object') {
      const inner = r.data;
      if (inner.token) {
        const { token, ...rest } = inner;
        return { token, data: Object.keys(rest).length ? rest : undefined };
      }

      // In some cases result.data may itself be an ApiPayload (nested). Try to unwrap once.
      if (inner.data && inner.data.token) {
        const { token, ...rest } = inner.data;
        return { token, data: Object.keys(rest).length ? rest : undefined };
      }
    }

    return { token: undefined, data: undefined };
  };

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    const { token, data } = extractAuthPayload(result);

    const payload = {
      success: true,
      code,
      message: result.message || '',
      data: data !== undefined ? data : undefined,
    };

    if (token) {
      res.cookie('token', token, opts).status(code).json(payload);
      return res;
    }

    // no token to set, just reply
    res.status(code).json(payload);
    return res;
  }

  const payload = {
    success: false,
    code,
    message: result && result.message ? result.message : (result || 'Error'),
    errors: result && result.errors ? result.errors : undefined,
  };

  return res.status(code).json(payload);
}

function providerResponse(res: Response, result: any, statusCode: number) {
  const code = result && typeof result.code === 'number' ? result.code : statusCode;
  const { token } = ((): any => {
    if (result && result.token) return { token: result.token };
    if (result && result.data && result.data.token) return { token: result.data.token };
    if (result && result.data && result.data.data && result.data.data.token) return { token: result.data.data.token };
    return { token: undefined };
  })();

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(), {
      expires: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    const redirectTo =
      ENVIRONMENT === 'prod' || ENVIRONMENT === 'production'
        ? callbackURL || 'https://neutra.ec'
        : callbackURLDev || 'http://localhost:3000';

    if (token) return res.cookie('token', token, opts).redirect(redirectTo);
    return res.redirect(redirectTo);
  }

  // normalize error shape on provider fallback so middleware will not double-wrap
  const payload = {
    success: false,
    code,
    message: result && result.message ? result.message : (result || 'Error'),
    errors: result && result.errors ? result.errors : undefined,
  };

  return res.status(code).json(payload);
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
