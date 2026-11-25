import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  formatSessionClearCookie,
  parseSessionCookie,
  verifySessionToken,
} from '../lib/session.ts';
import { getUserByUid, getUserByUidOrEmail, type DbUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  authUid?: string;
  dbUser?: DbUser;
}

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isValidCookieMutationCsrf(req: Request): boolean {
  const originHeader = req.get('origin');
  const forwardedHost = req.get('x-forwarded-host');
  const expectedHost = (forwardedHost ? forwardedHost.split(',')[0] : req.get('host'))
    ?.trim()
    .toLowerCase();

  let originMatchesHost = false;
  if (originHeader) {
    try {
      const originHost = new URL(originHeader).host.trim().toLowerCase();
      if (!expectedHost || originHost !== expectedHost) {
        return false;
      }
      originMatchesHost = true;
    } catch {
      return false;
    }
  }

  const requestedWith = (req.get('x-requested-with') || '').trim();
  const hasCustomHeader =
    requestedWith === 'ipet247-spa' || requestedWith === 'XMLHttpRequest';

  return originMatchesHost || hasCustomHeader;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;
  let authSource: 'bearer' | 'cookie' | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
    authSource = 'bearer';
  } else {
    const cookieToken = parseSessionCookie(req.headers.cookie);
    if (cookieToken) {
      token = cookieToken;
      authSource = 'cookie';
    }
  }

  if (!token || !authSource) {
    return res.status(401).json({ error: 'No autorizado: falta el token de sesión.' });
  }

  if (authSource === 'cookie') {
    if (!SAFE_HTTP_METHODS.has(req.method.toUpperCase()) && !isValidCookieMutationCsrf(req)) {
      return res.status(403).json({
        error: 'Solicitud bloqueada por validación de origen de sesión.',
      });
    }
    if (!token.startsWith('ipet1.')) {
      res.setHeader('Set-Cookie', formatSessionClearCookie());
      return res.status(401).json({ error: 'Sesión expirada o inválida. Vuelva a iniciar sesión.' });
    }
  }

  // Check server-signed custom credential session token first
  if (token.startsWith('ipet1.')) {
    const verified = verifySessionToken(token);
    if (!verified) {
      if (authSource === 'cookie') {
        res.setHeader('Set-Cookie', formatSessionClearCookie());
      }
      return res.status(401).json({ error: 'Sesión expirada o inválida. Vuelva a iniciar sesión.' });
    }
    try {
      const dbUser = await getUserByUid(verified.uid);
      if (!dbUser) {
        if (authSource === 'cookie') {
          res.setHeader('Set-Cookie', formatSessionClearCookie());
        }
        return res.status(401).json({ error: 'Usuario no encontrado. Inicie sesión nuevamente.' });
      }
      req.authUid = dbUser.uid;
      req.dbUser = dbUser;
      return next();
    } catch (error) {
      console.error('Error loading user from session token:', error);
      return res.status(500).json({ error: 'Error al validar la sesión.' });
    }
  }

  // Otherwise verify Firebase Google ID token (must already be registered in PostgreSQL)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email || `${decodedToken.uid}@ipet247.edu.ar`;
    const dbUser = await getUserByUidOrEmail(decodedToken.uid, email);
    if (!dbUser) {
      return res.status(401).json({
        error: 'Cuenta no registrada en el I.P.E.T. N° 247. Regístrese por única vez en la pestaña "Registrarse".',
      });
    }
    req.authUid = dbUser.uid;
    req.dbUser = dbUser;
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or syncing user:', error);
    return res.status(401).json({ error: 'No autorizado: token inválido o expirado.' });
  }
};
