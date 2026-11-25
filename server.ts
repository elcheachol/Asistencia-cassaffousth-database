import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  createPasswordResetCode,
  deleteUserAccount,
  ensureAdminUser,
  getUserByEmail,
  getUserByUidOrEmail,
  invalidatePasswordResetCodeById,
  mapDbUserToProfile,
  recordLoginEvent,
  registerGoogleUser,
  registerPasswordUser,
  updateUserProfile,
  verifyAndConsumePasswordResetCode,
} from './src/db/users.ts';
import {
  hashPassword,
  hashResetCode,
  signSessionToken,
  verifyPassword,
} from './src/lib/session.ts';
import {
  createOrUpdateStudent,
  deleteAttendanceSheetById,
  deleteStudentById,
  getAllAttendanceSheets,
  getAllCourses,
  getAllStudents,
  getAllSubjects,
  getAttendanceSheetById,
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

// Register a persistent account (Preceptor or Profesor) in PostgreSQL
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, turn } = req.body ?? {};

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Ingrese su nombre y apellido completo.' });
    }
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Seleccione un rol válido (Profesor o Preceptor).' });
    }
    const resolvedTurn: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos' = VALID_TURNS.has(turn)
      ? turn
      : 'Mañana';

    const configuredAdmin = getConfiguredAdminCredentials();
    if (configuredAdmin && email.trim().toLowerCase() === configuredAdmin.email) {
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada con ese correo. Ingrese en la pestaña Iniciar sesión.',
      });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada con ese correo. Ingrese en la pestaña Iniciar sesión.',
      });
    }

    const passwordHash = await hashPassword(password);
    const assignedCourses =
      role === 'preceptor'
        ? ['c-1a', 'c-1b', 'c-2a', 'c-2b', 'c-3a', 'c-3b']
        : ['c-1a', 'c-2a', 'c-3a'];
    const assignedSubjects =
      role === 'preceptor' ? null : ['sub-tall-1a', 'sub-tall-2a', 'sub-tall-3a'];

    const created = await registerPasswordUser({
      email,
      passwordHash,
      name: name.trim(),
      role,
      turn: resolvedTurn,
      assignedCourses,
      assignedSubjects,
    });

    const token = signSessionToken(created.uid);
    return res.status(201).json({
      token,
      user: mapDbUserToProfile(created),
    });
  } catch (error) {
    console.error('POST /api/auth/register failed:', error);
    return res.status(500).json({ error: 'No se pudo completar el registro.' });
  }
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
      return res.json({
        token,
        user: mapDbUserToProfile(adminUser),
      });
    }

    const dbUser = await getUserByEmail(email);
    if (!dbUser) {
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

    return res.json({
      token,
      user: mapDbUserToProfile(dbUser),
    });
  } catch (error) {
    console.error('POST /api/auth/login failed:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Send 6-digit password reset verification code via Gmail API
app.post('/api/auth/password-reset/request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Falta la verificación de Google.' });
    }
    const firebaseIdToken = authHeader.split('Bearer ')[1];
    const { gmailAccessToken, email } = req.body ?? {};

    if (typeof gmailAccessToken !== 'string' || !gmailAccessToken.trim()) {
      return res.status(400).json({
        error: 'Se requiere autorización de Gmail para enviar el código de recuperación.',
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
    if (!decodedToken.email || decodedToken.email_verified === false) {
      return res.status(403).json({
        error: 'La cuenta de Google seleccionada no tiene un correo verificado.',
      });
    }

    const verifiedGmail = decodedToken.email.trim().toLowerCase();
    if (
      typeof email === 'string' &&
      email.trim() &&
      email.trim().toLowerCase() !== verifiedGmail
    ) {
      return res.status(403).json({
        error: `Debe verificar con la misma cuenta de Gmail que desea recuperar (${email.trim()}).`,
      });
    }

    const dbUser = await getUserByEmail(verifiedGmail);
    if (!dbUser) {
      return res.status(404).json({
        error: `No existe ninguna cuenta registrada con ${verifiedGmail}. Regístrese en la pestaña "Registrarse".`,
      });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const resetId = await createPasswordResetCode({
      userId: dbUser.id,
      email: verifiedGmail,
      codeHash: hashResetCode(code),
      expiresAt,
    });

    const subjectUtf8 = 'I.P.E.T. N° 247 - Código para cambiar su contraseña';
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subjectUtf8, 'utf8').toString('base64')}?=`;
    const bodyText = [
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
    ].join('\r\n');

    const rawMime = [
      `To: ${verifiedGmail}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      bodyText,
    ].join('\r\n');

    const rawBase64Url = Buffer.from(rawMime, 'utf8').toString('base64url');

    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gmailAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawBase64Url }),
      }
    );

    if (!gmailResponse.ok) {
      await invalidatePasswordResetCodeById(resetId);
      return res.status(502).json({
        error:
          'Gmail rechazó el envío del correo de verificación. Verifique haber otorgado permiso de envío e intente nuevamente.',
      });
    }

    return res.json({
      sent: true,
      email: verifiedGmail,
      expiresInMinutes: 10,
    });
  } catch (error) {
    console.error('POST /api/auth/password-reset/request failed:', error);
    return res.status(500).json({
      error: 'No se pudo enviar el código de recuperación mediante Gmail.',
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
      return res.json(mapDbUserToProfile(existing));
    }

    if (mode !== 'register') {
      return res.status(404).json({
        error: 'Su cuenta de Google aún no está registrada en el I.P.E.T. N° 247. Regístrese por única vez en la pestaña "Registrarse".',
      });
    }

    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: 'Seleccione un rol válido (Profesor o Preceptor).' });
    }

    const resolvedTurn: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos' = VALID_TURNS.has(turn)
      ? turn
      : 'Mañana';

    const resolvedName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : decodedToken.name?.trim() ||
          email.split('@')[0] ||
          (role === 'profesor' ? 'Profesor I.P.E.T. N° 247' : 'Preceptor I.P.E.T. N° 247');

    const assignedCourses =
      role === 'preceptor'
        ? ['c-1a', 'c-1b', 'c-2a', 'c-2b', 'c-3a', 'c-3b']
        : ['c-1a', 'c-2a', 'c-3a'];
    const assignedSubjects =
      role === 'preceptor' ? null : ['sub-tall-1a', 'sub-tall-2a', 'sub-tall-3a'];

    const created = await registerGoogleUser({
      uid: decodedToken.uid,
      email,
      name: resolvedName,
      role,
      turn: resolvedTurn,
      assignedCourses,
      assignedSubjects,
    });

    return res.status(201).json(mapDbUserToProfile(created));
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

    const [courses, subjects, students, attendanceSheets] = await Promise.all([
      getAllCourses(),
      getAllSubjects(),
      getAllStudents(),
      getAllAttendanceSheets(),
    ]);

    return res.json({
      user: mapDbUserToProfile(req.dbUser),
      courses,
      subjects,
      students,
      attendanceSheets,
    });
  } catch (error) {
    console.error('Error in /api/bootstrap:', error);
    return res.status(500).json({
      error: 'No se pudieron cargar los datos institucionales desde PostgreSQL.',
    });
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
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;

    const sheets = await getAllAttendanceSheets({ courseId, date, subjectId });
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
    if (!isAdmin && !isPreceptor && existingSheet.takenByUserId !== req.dbUser.uid) {
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
