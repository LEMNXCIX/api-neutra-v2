import { Response, Request, CookieOptions } from 'express';
import config from '@/config/index.config';
import { AUTH_CONSTANTS, DOMAIN_CONSTANTS, isProduction, isDevelopment } from '@/core/domain/constants';

const production: boolean = config.production;
const ENVIRONMENT: string = config.ENVIRONMENT;
const callbackURL: string | undefined = config.callbackURL;
const callbackURLDev: string | undefined = config.callbackURLDev;

function getCookieDomain(req: Request): string | undefined {
  const host = req.get('host');
  if (!host) return undefined;

  const domain = host.split(':')[0];

  // For local development with subdomains
  if (domain.endsWith(DOMAIN_CONSTANTS.LOCAL_LOCALHOST)) {
    return DOMAIN_CONSTANTS.LOCAL_LOCALHOST;
  }

  // For nip.io development (e.g. 172.27.16.1.nip.io)
  if (domain.endsWith(DOMAIN_CONSTANTS.LOCAL_NIPIO)) {
    const parts = domain.split('.');
    // nip.io with IP: [a,b,c,d,nip,io] -> 6 parts
    // We want the last 6 parts to cover any subdomain of that IP nip.io address
    if (parts.length >= DOMAIN_CONSTANTS.NIPIO_PARTS) {
      return '.' + parts.slice(-DOMAIN_CONSTANTS.NIPIO_PARTS).join('.');
    }
    return DOMAIN_CONSTANTS.LOCAL_NIPIO;
  }

  // For production - can be configured or derived
  // If we have a main domain like neuntra.ec, we might want .neuntra.ec
  if (production && !domain.includes('localhost') && domain.includes('.')) {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
  }

  return undefined;
}

function cookieOptions(req: Request): CookieOptions {
  const domain = getCookieDomain(req);

  const options: CookieOptions = {
    httpOnly: production || ENVIRONMENT === 'prod' || ENVIRONMENT === 'production',
    secure: production || ENVIRONMENT === 'prod' || ENVIRONMENT === 'production',
    sameSite: (production || ENVIRONMENT === 'prod' || ENVIRONMENT === 'production') ? 'none' : 'lax',
  };

  if (domain) {
    options.domain = domain;
  }

  return options;
}

export function authResponse(req: Request, res: Response, result: any, statusCode: number) {
  const code = result && typeof result.code === 'number' ? result.code : statusCode;

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(req), {
      expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
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
      res.cookie(AUTH_CONSTANTS.COOKIE_NAME, token, opts);
    }

    return res.apiSuccess(data, result.message, code);
  }

  return res.apiError(result.errors || result.message || result, result.message || 'Error', code);
}

export function providerResponse(req: Request, res: Response, result: any, statusCode: number) {
  const code = result && typeof result.code === 'number' ? result.code : statusCode;

  let token: string | undefined;
  if (result && result.token) token = result.token;
  else if (result && result.data && result.data.token) token = result.data.token;
  else if (result && result.data && result.data.data && result.data.data.token) token = result.data.data.token;

  if (result && result.success) {
    const opts = Object.assign({}, cookieOptions(req), {
      expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
    });

    const redirectTo =
      isProduction(ENVIRONMENT)
        ? callbackURL || 'https://neutra.ec'
        : callbackURLDev || 'http://localhost:3000';

    if (token) {
      res.cookie(AUTH_CONSTANTS.COOKIE_NAME, token, opts);
    }

    return res.redirect(redirectTo);
  }

  return res.apiError(result.errors || result.message || result, result.message || 'Error', code);
}

export function deleteCookie(req: Request, res: Response) {
  return res
    .cookie(
      AUTH_CONSTANTS.COOKIE_NAME,
      '',
      Object.assign({}, cookieOptions(req), {
        expires: new Date(),
      })
    )
    .apiSuccess(undefined, 'Se ha cerrado sesión correctamente', 200);
}

export default { authResponse, deleteCookie, providerResponse };
