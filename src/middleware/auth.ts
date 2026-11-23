import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/session.ts';
import { getUserByUid, getUserByUidOrEmail, type DbUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  authUid?: string;
  dbUser?: DbUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta el token de sesión.' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Check server-signed custom credential session token first
  if (token.startsWith('ipet1.')) {
    const verified = verifySessionToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Sesión expirada o inválida. Vuelva a iniciar sesión.' });
    }
    try {
      const dbUser = await getUserByUid(verified.uid);
      if (!dbUser) {
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
