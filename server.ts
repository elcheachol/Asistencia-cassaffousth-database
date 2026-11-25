import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  approveRegistrationRequest,
  createPasswordResetCode,
  deleteUserAccount,
  ensureAdminUser,
  getLatestRegistrationRequestByEmail,
  getPendingRegistrationRequestsCount,
  getUserByEmail,
  getUserByUidOrEmail,
  invalidatePasswordResetCodeById,
  invalidatePendingRegistrationRequestById,
  listRegistrationRequests,
  mapDbUserToProfile,
  recordLoginEvent,
  rejectRegistrationRequest,
  updateUserProfile,
  upsertPendingEmailRegistrationRequest,
  verifyAndConsumePasswordResetCode,
  verifyRegistrationEmailCode,
} from './src/db/users.ts';
import { escapeHtml, sendInstitutionalEmail } from './src/lib/mailer.ts';
import {
  formatSessionClearCookie,
  formatSessionSetCookie,
  hashPassword,
  hashResetCode,
  signSessionToken,
  verifyPassword,
} from './src/lib/session.ts';
import {
  createOrUpdateStudent,
  deleteAttendanceSheetById,
  deleteAttendanceSheetsByIds,
  deleteStudentById,
  getAllAttendanceSheets,
  getAllCourses,
  getAllStudents,
  getAllSubjects,
  getAttendanceSheetById,
  getAttendanceSheetByKey,
  getAttendanceSheetsByIds,
  getMonthlyReportFromDb,
  upsertAttendanceSheet,
} from './src/db/queries.ts';
import type { AttendanceEntry, AttendanceSheet, AttendanceStatus, Student, UserRole } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_STATUSES = new Set<AttendanceStatus>([
  'presente',
  'ausente',
  'justificado',
  'tardanza',
]);

const VALID_ROLES = new Set<UserRole>(['preceptor', 'profesor']);
const VALID_TURNS = new Set(['Mañana', 'Tarde', 'Noche', 'Ambos']);

function safeCompareSecret(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getConfiguredAdminCredentials(): { email: string; password: string; name: string } | null {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return null;
  const name = (process.env.ADMIN_NAME || '').trim() || 'Administrador I.P.E.T. N° 247';
  return { email, password, name };
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Public health endpoint (no DB probe on startup)
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ipet247-asistencias-api' });
});

// Step 1 of Registration: Send 6-digit identity verification code from server email service
app.post('/api/auth/register/send-code', async (req, res) => {
  try {
    const { authProvider, email, password, name, role, turn } = req.body ?? {};

    const resolvedProvider: 'password' | 'google' =
      authProvider === 'google' ? 'google' : 'password';

    let verifiedEmail = '';
    let googleUid: string | null = null;

    if (resolvedProvider === 'google') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Falta la verificación de cuenta con Google.' });
      }
      const firebaseIdToken = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
      if (!decodedToken.email || decodedToken.email_verified === false) {
        return res.status(403).json({
          error: 'La cuenta de Google seleccionada no tiene un correo verificado.',
        });
      }
      verifiedEmail = decodedToken.email.trim().toLowerCase();
      googleUid = decodedToken.uid;
    } else {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
      }
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      verifiedEmail = email.trim().toLowerCase();
    }

    const configuredAdmin = getConfiguredAdminCredentials();
    if (configuredAdmin && verifiedEmail === configuredAdmin.email) {
      return res.status(409).json({
        error: 'Este correo ya está reservado. Ingrese en la pestaña Iniciar sesión.',
      });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Ingrese su nombre y apellido completo.' });
    }
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Seleccione un rol válido (Profesor o Preceptor).' });
    }

    const resolvedTurn: 'Mañana' | 'Tarde' = turn === 'Tarde' ? 'Tarde' : 'Mañana';
    const existingActiveUser = await getUserByEmail(verifiedEmail);
    if (existingActiveUser) {
      return res.status(409).json({
        error: 'Ya existe una cuenta activa registrada con ese correo. Ingrese en la pestaña Iniciar sesión.',
      });
    }

    const existingRequest = await getLatestRegistrationRequestByEmail(verifiedEmail);
    if (existingRequest && existingRequest.status === 'pending_approval') {
      return res.status(409).json({
        error: 'Ya verificaste tu correo y tu solicitud está pendiente de aprobación por el Administrador.',
      });
    }

    const resolvedRole: 'profesor' | 'preceptor' = role === 'preceptor' ? 'preceptor' : 'profesor';
    const assignedCourses =
      resolvedRole === 'preceptor'
        ? ['c-1a', 'c-1b', 'c-2a', 'c-2b', 'c-3a', 'c-3b']
        : ['c-1a', 'c-2a', 'c-3a'];
    const assignedSubjects =
      resolvedRole === 'preceptor' ? null : ['sub-tall-1a', 'sub-tall-2a', 'sub-tall-3a'];

    const passwordHash =
      resolvedProvider === 'password' ? await hashPassword(password) : null;
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const requestId = await upsertPendingEmailRegistrationRequest({
      uid: googleUid,
      email: verifiedEmail,
      passwordHash,
      authProvider: resolvedProvider,
      name: name.trim(),
      role: resolvedRole,
      turn: resolvedTurn,
      assignedCourses,
      assignedSubjects,
      codeHash: hashResetCode(code),
      expiresAt,
    });

    const roleLabel = resolvedRole === 'preceptor' ? 'Preceptoría' : 'Profesor / Cátedra';
    const safeName = escapeHtml(name.trim());

    try {
      await sendInstitutionalEmail({
        to: verifiedEmail,
        subject: 'I.P.E.T. N° 247 - Código de verificación de registro',
        text: [
          `Hola ${name.trim()},`,
          '',
          'Recibimos tu solicitud de registro en el Sistema de Asistencias del I.P.E.T. N° 247.',
          `Rol solicitado: ${roleLabel} (Turno ${resolvedTurn})`,
          '',
          `Tu código de verificación de identidad es: ${code}`,
          '',
          'Este código vence en 15 minutos y puede usarse una sola vez.',
          'Una vez ingresado el código, tu solicitud será enviada al Administrador para su aprobación.',
          '',
          'I.P.E.T. N° 247 "Ing. Carlos A. Cassaffousth"',
        ].join('\r\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #D5DCE6; border-radius: 8px; overflow: hidden;">
            <div style="height: 6px; background: linear-gradient(90deg, #0F294A 75%, #B91C1C 25%);"></div>
            <div style="padding: 24px; color: #1E293B;">
              <p style="font-size: 12px; font-weight: bold; color: #B91C1C; margin: 0 0 6px;">I.P.E.T. N° 247 · Sistema de Asistencias</p>
              <h2 style="font-size: 18px; color: #0F294A; margin: 0 0 14px;">Verificación de identidad</h2>
              <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">Hola <strong>${safeName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">Recibimos tu solicitud de registro como <strong>${roleLabel}</strong> (Turno ${resolvedTurn}). Ingresá este código en la pantalla de registro:</p>
              <div style="background: #F3F5F8; border: 1px solid #D5DCE6; border-radius: 6px; padding: 14px; text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 6px; color: #0F294A; margin-bottom: 16px;">${code}</div>
              <p style="font-size: 12px; color: #475569; margin: 0;">Este código vence en 15 minutos. Luego de validarlo, tu solicitud quedará pendiente de aprobación por el Administrador.</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      await invalidatePendingRegistrationRequestById(requestId);
      const message =
        mailError instanceof Error
          ? mailError.message
          : 'No se pudo enviar el código de verificación a su correo.';
      return res.status(502).json({ error: message });
    }

    return res.json({
      sent: true,
      email: verifiedEmail,
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error('POST /api/auth/register/send-code failed:', error);
    return res.status(500).json({
      error: 'No se pudo procesar el envío del código de verificación.',
    });
  }
});

// Step 2 of Registration: Verify 6-digit email code and notify Administrator
app.post('/api/auth/register/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body ?? {};

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ error: 'Ingrese el código de 6 dígitos enviado a su correo.' });
    }

    const result = await verifyRegistrationEmailCode({
      email: email.trim(),
      code: code.trim(),
    });

    if (!result.ok) {
      if (result.reason === 'too_many_attempts') {
        return res.status(429).json({
          error: 'Demasiados intentos fallidos. Solicite un nuevo código de verificación.',
        });
      }
      if (result.reason === 'already_verified') {
        return res.status(409).json({
          error: 'Este correo ya fue verificado y tu solicitud aguarda aprobación del Administrador.',
        });
      }
      if (result.reason === 'not_found') {
        return res.status(400).json({
          error: 'El código venció o no existe. Solicite un nuevo código de verificación.',
        });
      }
      return res.status(400).json({
        error: 'El código ingresado es incorrecto. Revise su bandeja de entrada.',
      });
    }

    // Secondary email alert to Administration via server mailer (in-app DB notification is always created)
    let adminNotifiedByEmail = false;
    const configuredAdmin = getConfiguredAdminCredentials();
    if (configuredAdmin) {
      try {
        const reqInfo = result.request;
        const roleLabel = reqInfo.role === 'preceptor' ? 'Preceptoría' : 'Profesor / Cátedra';
        const safeName = escapeHtml(reqInfo.name);
        const safeEmail = escapeHtml(reqInfo.email);
        await sendInstitutionalEmail({
          to: configuredAdmin.email,
          subject: `I.P.E.T. N° 247 - Nueva solicitud de registro (${reqInfo.name})`,
          text: [
            'Nueva solicitud de acceso pendiente de aprobación en el Sistema de Asistencias:',
            '',
            `Nombre y Apellido: ${reqInfo.name}`,
            `Correo verificado: ${reqInfo.email}`,
            `Rol solicitado: ${roleLabel}`,
            `Turno: ${reqInfo.turn}`,
            '',
            'Ingresá al sistema con tu cuenta de Administrador para Aceptar o Declinar esta solicitud en el apartado "Solicitudes".',
            '',
            'I.P.E.T. N° 247 "Ing. Carlos A. Cassaffousth"',
          ].join('\r\n'),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #D5DCE6; border-radius: 8px; overflow: hidden;">
              <div style="height: 6px; background: linear-gradient(90deg, #0F294A 75%, #B91C1C 25%);"></div>
              <div style="padding: 24px; color: #1E293B;">
                <p style="font-size: 12px; font-weight: bold; color: #B91C1C; margin: 0 0 6px;">I.P.E.T. N° 247 · Notificación de Administración</p>
                <h2 style="font-size: 18px; color: #0F294A; margin: 0 0 12px;">Nueva solicitud de registro verificada</h2>
                <p style="font-size: 13px; line-height: 1.5; margin: 0 0 12px;">Un usuario verificó su correo electrónico y aguarda su autorización para ingresar:</p>
                <ul style="font-size: 13px; line-height: 1.7; background: #F8FAFC; border: 1px solid #D5DCE6; border-radius: 6px; padding: 12px 18px; margin: 0 0 14px;">
                  <li><strong>Nombre:</strong> ${safeName}</li>
                  <li><strong>Correo:</strong> ${safeEmail}</li>
                  <li><strong>Rol:</strong> ${roleLabel}</li>
                  <li><strong>Turno:</strong> ${reqInfo.turn}</li>
                </ul>
                <p style="font-size: 12px; color: #475569; margin: 0;">Ingresá al sistema como Administrador y abrí la pestaña <strong>Solicitudes</strong> para Aceptar o Declinar el registro.</p>
              </div>
            </div>
          `,
        });
        adminNotifiedByEmail = true;
      } catch {
        adminNotifiedByEmail = false;
      }
    }

    return res.status(201).json({
      verified: true,
      pendingApproval: true,
      adminNotifiedByEmail,
      message:
        'Identidad verificada por correo. Se notificó al Administrador para que acepte o decline tu solicitud de registro.',
    });
  } catch (error) {
    console.error('POST /api/auth/register/verify-code failed:', error);
    return res.status(500).json({ error: 'No se pudo verificar el código de registro.' });
  }
});

// Direct unverified registration is disabled; all registrations require Gmail verification + Admin approval
app.post('/api/auth/register', (_req, res) => {
  return res.status(403).json({
    error: 'El registro requiere verificación de identidad mediante Gmail y aprobación del Administrador.',
  });
});

// Login with saved email & password from PostgreSQL
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Ingrese su correo electrónico y contraseña.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const configuredAdmin = getConfiguredAdminCredentials();
    if (
      configuredAdmin &&
      safeCompareSecret(normalizedEmail, configuredAdmin.email) &&
      safeCompareSecret(password, configuredAdmin.password)
    ) {
      const passwordHash = await hashPassword(password);
      const adminUser = await ensureAdminUser({
        email: configuredAdmin.email,
        passwordHash,
        name: configuredAdmin.name,
      });
      const token = signSessionToken(adminUser.uid);
      res.setHeader('Set-Cookie', formatSessionSetCookie(token));
      return res.json({
        token,
        user: mapDbUserToProfile(adminUser),
      });
    }

    const dbUser = await getUserByEmail(email);
    if (!dbUser) {
      const pendingReq = await getLatestRegistrationRequestByEmail(normalizedEmail);
      if (pendingReq) {
        if (pendingReq.status === 'pending_approval') {
          return res.status(403).json({
            error:
              'Tu identidad por Gmail ya fue verificada, pero tu solicitud aún aguarda la aprobación del Administrador.',
          });
        }
        if (pendingReq.status === 'rejected') {
          const reasonSuffix = pendingReq.rejectionReason
            ? ` Motivo: ${pendingReq.rejectionReason}`
            : '';
          return res.status(403).json({
            error: `Tu solicitud de registro fue declinada por Administración.${reasonSuffix}`,
          });
        }
        if (pendingReq.status === 'pending_email') {
          return res.status(403).json({
            error:
              'Aún no completaste la verificación con el código enviado a tu Gmail. Volvé a la pestaña "Registrarse" para finalizar tu solicitud.',
          });
        }
      }
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    if (!dbUser.passwordHash) {
      return res.status(401).json({
        error: 'Esta cuenta fue registrada con Google. Utilice el botón "Ingresar con Google".',
      });
    }

    const valid = await verifyPassword(password, dbUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    await recordLoginEvent(dbUser.id, 'password', dbUser.role);
    const token = signSessionToken(dbUser.uid);
    res.setHeader('Set-Cookie', formatSessionSetCookie(token));

    return res.json({
      token,
      user: mapDbUserToProfile(dbUser),
    });
  } catch (error) {
    console.error('POST /api/auth/login failed:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Clear persistent HttpOnly session cookie on logout
app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', formatSessionClearCookie());
  return res.json({ loggedOut: true });
});

// Send 6-digit password reset verification code via server email service
app.post('/api/auth/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const configuredAdmin = getConfiguredAdminCredentials();
    if (configuredAdmin && normalizedEmail === configuredAdmin.email) {
      return res.status(403).json({
        error: 'La contraseña de Administración se gestiona desde la configuración del servidor.',
      });
    }

    const dbUser = await getUserByEmail(normalizedEmail);
    if (!dbUser) {
      return res.status(404).json({
        error: `No existe ninguna cuenta activa registrada con ${normalizedEmail}.`,
      });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const resetId = await createPasswordResetCode({
      userId: dbUser.id,
      email: normalizedEmail,
      codeHash: hashResetCode(code),
      expiresAt,
    });

    const safeName = escapeHtml(dbUser.name);
    try {
      await sendInstitutionalEmail({
        to: normalizedEmail,
        subject: 'I.P.E.T. N° 247 - Código para cambiar su contraseña',
        text: [
          `Hola ${dbUser.name},`,
          '',
          'Recibimos una solicitud para cambiar la contraseña de su cuenta en el Sistema de Asistencias del I.P.E.T. N° 247.',
          '',
          `Su código de verificación es: ${code}`,
          '',
          'Este código vence en 10 minutos y puede usarse una sola vez.',
          'Si usted no solicitó este cambio, ignore este mensaje.',
          '',
          'I.P.E.T. N° 247 "Ing. Carlos A. Cassaffousth"',
        ].join('\r\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #D5DCE6; border-radius: 8px; overflow: hidden;">
            <div style="height: 6px; background: linear-gradient(90deg, #0F294A 75%, #B91C1C 25%);"></div>
            <div style="padding: 24px; color: #1E293B;">
              <p style="font-size: 12px; font-weight: bold; color: #B91C1C; margin: 0 0 6px;">I.P.E.T. N° 247 · Recuperación de Contraseña</p>
              <h2 style="font-size: 18px; color: #0F294A; margin: 0 0 12px;">Código de verificación</h2>
              <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">Hola <strong>${safeName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">Ingresá este código de 6 dígitos para actualizar tu contraseña:</p>
              <div style="background: #F3F5F8; border: 1px solid #D5DCE6; border-radius: 6px; padding: 14px; text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 6px; color: #0F294A; margin-bottom: 16px;">${code}</div>
              <p style="font-size: 12px; color: #475569; margin: 0;">Este código vence en 10 minutos y puede usarse una sola vez.</p>
            </div>
          </div>
        `,
      });
    } catch (mailError) {
      await invalidatePasswordResetCodeById(resetId);
      const message =
        mailError instanceof Error
          ? mailError.message
          : 'No se pudo enviar el correo de recuperación.';
      return res.status(502).json({ error: message });
    }

    return res.json({
      sent: true,
      email: normalizedEmail,
      expiresInMinutes: 10,
    });
  } catch (error) {
    console.error('POST /api/auth/password-reset/request failed:', error);
    return res.status(500).json({
      error: 'No se pudo enviar el código de recuperación.',
    });
  }
});

// Verify 6-digit Gmail code and set new password in PostgreSQL
app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body ?? {};

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({ error: 'Ingrese el código de 6 dígitos enviado a su Gmail.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const newPasswordHash = await hashPassword(newPassword);
    const result = await verifyAndConsumePasswordResetCode({
      email: email.trim(),
      code: code.trim(),
      newPasswordHash,
    });

    if (!result.ok) {
      if (result.reason === 'too_many_attempts') {
        return res.status(429).json({
          error: 'Demasiados intentos fallidos. Solicite un nuevo código mediante Gmail.',
        });
      }
      if (result.reason === 'not_found') {
        return res.status(400).json({
          error: 'El código venció o no existe. Solicite un nuevo código mediante Gmail.',
        });
      }
      return res.status(400).json({
        error: 'El código ingresado es incorrecto. Verifique su Gmail.',
      });
    }

    return res.json({
      updated: true,
      message: 'Contraseña actualizada correctamente. Ya puede iniciar sesión con su nueva contraseña.',
    });
  } catch (error) {
    console.error('POST /api/auth/password-reset/confirm failed:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
  }
});

// Verified Google Sign-In / First-Time Google Registration in PostgreSQL
app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Falta el token de verificación de Google.' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = (decodedToken.email || `${decodedToken.uid}@ipet247.edu.ar`).trim().toLowerCase();

    const { mode, role, turn, name } = req.body ?? {};
    const configuredAdmin = getConfiguredAdminCredentials();
    if (configuredAdmin && email === configuredAdmin.email) {
      return res.status(403).json({
        error: 'Esta cuenta requiere ingreso con correo y contraseña.',
      });
    }

    const existing = await getUserByUidOrEmail(decodedToken.uid, email);

    if (existing) {
      if (mode === 'register' && VALID_ROLES.has(role) && role !== existing.role) {
        const currentRoleLabel = existing.role === 'preceptor' ? 'Preceptor' : 'Profesor';
        return res.status(409).json({
          error: `Esta cuenta ya está registrada como ${currentRoleLabel}. Por preservación de datos no se puede cambiar de rol; inicie sesión desde la pestaña "Iniciar sesión".`,
        });
      }

      await recordLoginEvent(existing.id, 'google', existing.role);
      res.setHeader('Set-Cookie', formatSessionClearCookie());
      return res.json(mapDbUserToProfile(existing));
    }

    const pendingReq = await getLatestRegistrationRequestByEmail(email);
    if (pendingReq) {
      if (pendingReq.status === 'pending_approval') {
        return res.status(403).json({
          error:
            'Tu identidad por Gmail ya fue verificada, pero tu solicitud de registro aún aguarda la aprobación del Administrador.',
        });
      }
      if (pendingReq.status === 'rejected') {
        const reasonSuffix = pendingReq.rejectionReason
          ? ` Motivo: ${pendingReq.rejectionReason}`
          : '';
        return res.status(403).json({
          error: `Tu solicitud de registro fue declinada por Administración.${reasonSuffix}`,
        });
      }
    }

    if (mode !== 'register') {
      return res.status(404).json({
        error: 'Su cuenta de Google aún no está registrada en el I.P.E.T. N° 247. Regístrese por única vez en la pestaña "Registrarse".',
      });
    }

    return res.status(403).json({
      error: 'Complete la verificación por código de Gmail para enviar su solicitud al Administrador.',
    });
  } catch (error) {
    console.error('POST /api/auth/google-sync failed:', error);
    return res.status(401).json({ error: 'No se pudo verificar el acceso institucional con Google.' });
  }
});

// Current authenticated user profile from PostgreSQL
app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
  if (!req.dbUser) {
    return res.status(401).json({ error: 'Usuario no autenticado.' });
  }
  return res.json(mapDbUserToProfile(req.dbUser));
});

// Update non-privileged profile attributes (role, courses & subjects are locked for data preservation)
app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.authUid || !req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const { role, turn, name, assignedCourses, assignedSubjects } = req.body ?? {};

    if (
      role !== undefined ||
      assignedCourses !== undefined ||
      assignedSubjects !== undefined
    ) {
      return res.status(403).json({
        error:
          'Por seguridad y preservación de datos, no está permitido cambiar de rol (Preceptor/Profesor) o cátedras dentro de una sesión. Cierre sesión e ingrese con la cuenta verificada correspondiente.',
      });
    }

    if (turn !== undefined && !VALID_TURNS.has(turn)) {
      return res.status(400).json({ error: 'Turno inválido.' });
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío.' });
    }

    const updated = await updateUserProfile(req.authUid, {
      name: typeof name === 'string' ? name.trim() : undefined,
      turn: turn ?? undefined,
    });

    return res.json(mapDbUserToProfile(updated));
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Error al actualizar el perfil en PostgreSQL.' });
  }
});

// Permanently delete authenticated user account, end session, and sever course/subject links
app.delete('/api/me/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const { password, confirmText } = req.body ?? {};

    if (req.dbUser.passwordHash) {
      if (typeof password !== 'string' || !password) {
        return res.status(400).json({
          error: 'Ingrese su contraseña actual para confirmar la eliminación de la cuenta.',
        });
      }
      const valid = await verifyPassword(password, req.dbUser.passwordHash);
      if (!valid) {
        return res.status(401).json({
          error: 'Contraseña incorrecta. No se eliminó la cuenta.',
        });
      }
    } else {
      if (typeof confirmText !== 'string' || confirmText.trim().toUpperCase() !== 'ELIMINAR') {
        return res.status(400).json({
          error: 'Escriba "ELIMINAR" para confirmar la baja definitiva de la cuenta.',
        });
      }
    }

    const uidToDelete = req.dbUser.uid;
    await deleteUserAccount(req.dbUser);

    if (!uidToDelete.startsWith('local-')) {
      await adminAuth.deleteUser(uidToDelete).catch(() => {});
    }

    res.setHeader('Set-Cookie', formatSessionClearCookie());
    return res.json({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/me/account failed:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la cuenta.' });
  }
});

// Single authenticated bootstrap endpoint to hydrate frontend state from PostgreSQL
app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const isAdmin = req.dbUser.role === 'administrador';
    const [courses, subjects, students, attendanceSheets, pendingRegistrationRequestsCount] =
      await Promise.all([
        getAllCourses(),
        getAllSubjects(),
        getAllStudents(),
        getAllAttendanceSheets(),
        isAdmin ? getPendingRegistrationRequestsCount() : Promise.resolve(0),
      ]);

    return res.json({
      user: mapDbUserToProfile(req.dbUser),
      courses,
      subjects,
      students,
      attendanceSheets,
      pendingRegistrationRequestsCount,
    });
  } catch (error) {
    console.error('Error in /api/bootstrap:', error);
    return res.status(500).json({
      error: 'No se pudieron cargar los datos institucionales desde PostgreSQL.',
    });
  }
});

// Admin-only registration requests management
app.get('/api/admin/registration-requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser || req.dbUser.role !== 'administrador') {
      return res.status(403).json({
        error: 'Solo Administración puede consultar y gestionar solicitudes de registro.',
      });
    }
    const requests = await listRegistrationRequests();
    const pendingCount = requests.filter((r) => r.status === 'pending_approval').length;
    return res.json({ requests, pendingCount });
  } catch (error) {
    console.error('GET /api/admin/registration-requests failed:', error);
    return res.status(500).json({ error: 'No se pudieron cargar las solicitudes de registro.' });
  }
});

app.post('/api/admin/registration-requests/:id/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser || req.dbUser.role !== 'administrador') {
      return res.status(403).json({
        error: 'Solo Administración puede aceptar solicitudes de registro.',
      });
    }
    const requestId = parseInt(String(req.params.id || ''), 10);
    if (Number.isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'ID de solicitud inválido.' });
    }

    const result = await approveRegistrationRequest({
      requestId,
      adminUid: req.dbUser.uid,
      adminName: req.dbUser.name,
    });

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return res.status(404).json({ error: 'Solicitud no encontrada.' });
      }
      if (result.reason === 'already_exists') {
        return res.status(409).json({ error: 'El usuario ya tiene una cuenta activa.' });
      }
      return res.status(409).json({ error: 'La solicitud ya fue procesada anteriormente.' });
    }

    return res.json({ approved: true, request: result.request });
  } catch (error) {
    console.error('POST /api/admin/registration-requests/:id/approve failed:', error);
    return res.status(500).json({ error: 'No se pudo aprobar la solicitud de registro.' });
  }
});

app.post('/api/admin/registration-requests/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser || req.dbUser.role !== 'administrador') {
      return res.status(403).json({
        error: 'Solo Administración puede declinar solicitudes de registro.',
      });
    }
    const requestId = parseInt(String(req.params.id || ''), 10);
    if (Number.isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'ID de solicitud inválido.' });
    }

    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 300)
        : undefined;

    const result = await rejectRegistrationRequest({
      requestId,
      adminUid: req.dbUser.uid,
      adminName: req.dbUser.name,
      reason,
    });

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return res.status(404).json({ error: 'Solicitud no encontrada.' });
      }
      return res.status(409).json({ error: 'La solicitud ya fue procesada anteriormente.' });
    }

    return res.json({ rejected: true, request: result.request });
  } catch (error) {
    console.error('POST /api/admin/registration-requests/:id/reject failed:', error);
    return res.status(500).json({ error: 'No se pudo declinar la solicitud de registro.' });
  }
});

// Courses
app.get('/api/courses', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const data = await getAllCourses();
    return res.json(data);
  } catch (error) {
    console.error('GET /api/courses failed:', error);
    return res.status(500).json({ error: 'Error al obtener los cursos.' });
  }
});

// Subjects
app.get('/api/subjects', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const data = await getAllSubjects();
    return res.json(data);
  } catch (error) {
    console.error('GET /api/subjects failed:', error);
    return res.status(500).json({ error: 'Error al obtener las materias.' });
  }
});

// Students CRUD
app.get('/api/students', requireAuth, async (req: AuthRequest, res) => {
  try {
    const courseId =
      typeof req.query.courseId === 'string' && req.query.courseId !== 'all'
        ? req.query.courseId
        : undefined;
    const data = await getAllStudents(courseId);
    return res.json(data);
  } catch (error) {
    console.error('GET /api/students failed:', error);
    return res.status(500).json({ error: 'Error al obtener la nómina de alumnos.' });
  }
});

app.post('/api/students', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, dni, lastName, firstName, courseId, guardianName, guardianPhone, email } =
      req.body ?? {};

    if (
      typeof dni !== 'string' ||
      !dni.trim() ||
      typeof lastName !== 'string' ||
      !lastName.trim() ||
      typeof firstName !== 'string' ||
      !firstName.trim() ||
      typeof courseId !== 'string' ||
      !courseId.trim()
    ) {
      return res.status(400).json({
        error: 'DNI, Apellido, Nombre y Curso son campos obligatorios.',
      });
    }

    const availableCourses = await getAllCourses();
    if (!availableCourses.some((c) => c.id === courseId.trim())) {
      return res.status(400).json({
        error: 'El curso seleccionado no pertenece al ciclo habilitado (1° a 3° Año).',
      });
    }

    const studentPayload: Student = {
      id: typeof id === 'string' && id.trim() ? id.trim() : `st-${Date.now()}`,
      dni: dni.trim(),
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      courseId: courseId.trim(),
      guardianName: typeof guardianName === 'string' && guardianName.trim() ? guardianName.trim() : undefined,
      guardianPhone: typeof guardianPhone === 'string' && guardianPhone.trim() ? guardianPhone.trim() : undefined,
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
    };

    const saved = await createOrUpdateStudent(studentPayload);
    return res.status(201).json(saved);
  } catch (error) {
    console.error('POST /api/students failed:', error);
    return res.status(500).json({ error: 'No se pudo registrar el alumno en PostgreSQL.' });
  }
});

app.delete('/api/students/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser || (req.dbUser.role !== 'preceptor' && req.dbUser.role !== 'administrador')) {
      return res.status(403).json({
        error: 'Solo Preceptoría o Administración puede dar de baja alumnos del padrón institucional.',
      });
    }
    const studentId = String(req.params.id || '').trim();
    if (!studentId) {
      return res.status(400).json({ error: 'ID de alumno inválido.' });
    }
    await deleteStudentById(studentId);
    return res.json({ deleted: true, id: studentId });
  } catch (error) {
    console.error('DELETE /api/students/:id failed:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el alumno.' });
  }
});

// Attendance Sheets CRUD
app.get('/api/attendance', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
    const takenByUserId =
      req.dbUser.role === 'administrador' ? undefined : req.dbUser.uid;

    const sheets = await getAllAttendanceSheets({ courseId, date, subjectId, takenByUserId });
    return res.json(sheets);
  } catch (error) {
    console.error('GET /api/attendance failed:', error);
    return res.status(500).json({ error: 'Error al consultar el libro de asistencias.' });
  }
});

app.post('/api/attendance', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const { id, date, courseId, subjectId, turn, entries, notes } = req.body ?? {};

    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof courseId !== 'string' ||
      !courseId.trim() ||
      typeof subjectId !== 'string' ||
      !subjectId.trim() ||
      !Array.isArray(entries)
    ) {
      return res.status(400).json({
        error: 'Datos de asistencia inválidos. Verifique fecha, curso, materia y lista.',
      });
    }

    // Server-side institutional role enforcement (I.P.E.T. N° 247)
    const userRole: UserRole =
      req.dbUser.role === 'administrador'
        ? 'administrador'
        : req.dbUser.role === 'preceptor'
        ? 'preceptor'
        : 'profesor';
    if (userRole === 'preceptor' && subjectId !== 'sub-general') {
      return res.status(403).json({
        error:
          'Los preceptores únicamente pueden registrar Asistencia General Institucional (no materias individuales).',
      });
    }
    if (userRole === 'profesor' && subjectId === 'sub-general') {
      return res.status(403).json({
        error:
          'Los profesores únicamente pueden registrar asistencia en sus materias asignadas (no Asistencia General).',
      });
    }

    if (userRole !== 'administrador') {
      const existingByKey = await getAttendanceSheetByKey(date, courseId.trim(), subjectId.trim());
      if (existingByKey && existingByKey.takenByUserId !== req.dbUser.uid) {
        return res.status(403).json({
          error:
            'No tiene permiso para modificar una planilla registrada por otro usuario. Solo Administración puede editar registros ajenos.',
        });
      }
    }

    const sanitizedEntries: AttendanceEntry[] = [];
    for (const item of entries) {
      if (
        !item ||
        typeof item.studentId !== 'string' ||
        !item.studentId.trim() ||
        !VALID_STATUSES.has(item.status)
      ) {
        return res.status(400).json({ error: 'Estado de asistencia inválido en la nómina.' });
      }
      sanitizedEntries.push({
        studentId: item.studentId.trim(),
        status: item.status,
        observation:
          typeof item.observation === 'string' && item.observation.trim()
            ? item.observation.trim()
            : undefined,
      });
    }

    const sheetPayload: AttendanceSheet = {
      id:
        typeof id === 'string' && id.trim()
          ? id.trim()
          : `sheet-${date}-${courseId}-${subjectId}`,
      date,
      courseId: courseId.trim(),
      subjectId: subjectId.trim(),
      turn: turn === 'Tarde' ? 'Tarde' : 'Mañana',
      takenByUserId: req.dbUser.uid,
      takenByUserName: req.dbUser.name,
      takenByRole: userRole,
      entries: sanitizedEntries,
      timestamp: new Date().toISOString(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
    };

    const saved = await upsertAttendanceSheet(sheetPayload, req.dbUser.id);
    return res.status(201).json(saved);
  } catch (error) {
    console.error('POST /api/attendance failed:', error);
    return res.status(500).json({ error: 'No se pudo guardar la asistencia en PostgreSQL.' });
  }
});

app.delete('/api/attendance/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }
    const sheetId = String(req.params.id || '').trim();
    if (!sheetId) {
      return res.status(400).json({ error: 'ID de planilla inválido.' });
    }

    const existingSheet = await getAttendanceSheetById(sheetId);
    if (!existingSheet) {
      return res.status(404).json({ error: 'Planilla no encontrada.' });
    }

    const isAdmin = req.dbUser.role === 'administrador';
    const isPreceptor = req.dbUser.role === 'preceptor';
    if (!isAdmin && isPreceptor && existingSheet.subjectId !== 'sub-general') {
      return res.status(403).json({
        error: 'Por preservación de datos, Preceptoría no puede eliminar registros de materias de profesores.',
      });
    }
    if (!isAdmin && existingSheet.takenByUserId !== req.dbUser.uid) {
      return res.status(403).json({
        error: 'Solo puede anular planillas de asistencia que usted mismo haya registrado.',
      });
    }

    await deleteAttendanceSheetById(sheetId);
    return res.json({ deleted: true, id: sheetId });
  } catch (error) {
    console.error('DELETE /api/attendance/:id failed:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la planilla de asistencia.' });
  }
});

app.post('/api/attendance/bulk-delete', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const rawIds = req.body?.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ error: 'Seleccione al menos una planilla para eliminar.' });
    }

    const uniqueIds = Array.from(
      new Set(
        rawIds
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );

    if (uniqueIds.length === 0 || uniqueIds.length > 200) {
      return res.status(400).json({
        error: 'Cantidad de planillas seleccionadas inválida (entre 1 y 200 por operación).',
      });
    }

    const existingSheets = await getAttendanceSheetsByIds(uniqueIds);
    if (existingSheets.length === 0) {
      return res.status(404).json({ error: 'No se encontraron las planillas seleccionadas.' });
    }

    const isAdmin = req.dbUser.role === 'administrador';
    const isPreceptor = req.dbUser.role === 'preceptor';

    for (const sheet of existingSheets) {
      if (!isAdmin && isPreceptor && sheet.subjectId !== 'sub-general') {
        return res.status(403).json({
          error: 'Por preservación de datos, Preceptoría no puede eliminar registros de materias de profesores.',
        });
      }
      if (!isAdmin && sheet.takenByUserId !== req.dbUser.uid) {
        return res.status(403).json({
          error: 'Solo puede anular planillas de asistencia que usted mismo haya registrado.',
        });
      }
    }

    const authorizedIds = existingSheets.map((s) => s.id);
    const deletedCount = await deleteAttendanceSheetsByIds(authorizedIds);
    return res.json({ deletedCount, deletedIds: authorizedIds });
  } catch (error) {
    console.error('POST /api/attendance/bulk-delete failed:', error);
    return res.status(500).json({ error: 'No se pudieron eliminar las planillas seleccionadas.' });
  }
});

// Monthly report computed from PostgreSQL
app.get('/api/reports/monthly', requireAuth, async (req: AuthRequest, res) => {
  try {
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId.trim() : '';
    const year = parseInt(String(req.query.year || ''), 10);
    const month = parseInt(String(req.query.month || ''), 10);
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId.trim() : undefined;

    if (!courseId || Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Parámetros inválidos para el reporte mensual (courseId, year, month).',
      });
    }

    const report = await getMonthlyReportFromDb(courseId, year, month, subjectId);
    return res.json(report);
  } catch (error) {
    console.error('GET /api/reports/monthly failed:', error);
    return res.status(500).json({ error: 'Error al generar el reporte mensual desde PostgreSQL.' });
  }
});

// Setup Vite in dev or static dist in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Express I.P.E.T. N° 247 escuchando en puerto ${PORT}`);
  });
}

startServer();
