import crypto from 'crypto';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  attendanceSheets,
  courses,
  loginEvents,
  passwordResetCodes,
  registrationRequests,
  subjects,
  users,
} from './schema.ts';
import { verifyResetCodeHash } from '../lib/session.ts';
import type { RegistrationRequest, UserProfile, UserRole } from '../types/index.ts';

export type DbUser = typeof users.$inferSelect;

export async function getUserByUid(uid: string): Promise<DbUser | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database error in getUserByUid:', error);
    throw new Error('No se pudo consultar el usuario en PostgreSQL.', { cause: error });
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const normalized = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database error in getUserByEmail:', error);
    throw new Error('No se pudo consultar el correo en PostgreSQL.', { cause: error });
  }
}

export async function recordLoginEvent(
  userId: number,
  provider: 'password' | 'google',
  roleAtLogin: string
): Promise<void> {
  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ lastLoginAt: now })
        .where(eq(users.id, userId));

      await tx.insert(loginEvents).values({
        userId,
        provider,
        roleAtLogin,
        loggedInAt: now,
      });
    });
  } catch (error) {
    console.error('Database error in recordLoginEvent:', error);
  }
}

export async function registerPasswordUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  turn: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos';
  assignedCourses: string[];
  assignedSubjects: string[] | null;
}): Promise<DbUser> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const newUid = `local-${crypto.randomUUID()}`;
    const now = new Date();

    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(users)
        .values({
          uid: newUid,
          email: normalizedEmail,
          passwordHash: input.passwordHash,
          authProvider: 'password',
          name: input.name.trim(),
          role: input.role,
          turn: input.turn,
          assignedCourses: input.assignedCourses,
          assignedSubjects: input.assignedSubjects,
          lastLoginAt: now,
        })
        .returning();

      const createdUser = inserted[0];

      await tx.insert(loginEvents).values({
        userId: createdUser.id,
        provider: 'password',
        roleAtLogin: createdUser.role,
        loggedInAt: now,
      });

      return createdUser;
    });
  } catch (error) {
    console.error('Database error in registerPasswordUser:', error);
    throw new Error('No se pudo registrar la cuenta en PostgreSQL.', { cause: error });
  }
}

export async function ensureAdminUser(input: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<DbUser> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date();
    const allCourses = ['c-1a', 'c-1b', 'c-2a', 'c-2b', 'c-3a', 'c-3b'];

    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      let adminUser: DbUser;

      if (existing.length > 0) {
        const updated = await tx
          .update(users)
          .set({
            passwordHash: input.passwordHash,
            authProvider: 'password',
            role: 'administrador',
            turn: 'Ambos',
            assignedCourses: allCourses,
            assignedSubjects: null,
            lastLoginAt: now,
          })
          .where(eq(users.id, existing[0].id))
          .returning();
        adminUser = updated[0];
      } else {
        const inserted = await tx
          .insert(users)
          .values({
            uid: `admin-${crypto.randomUUID()}`,
            email: normalizedEmail,
            passwordHash: input.passwordHash,
            authProvider: 'password',
            name: input.name.trim(),
            role: 'administrador',
            turn: 'Ambos',
            assignedCourses: allCourses,
            assignedSubjects: null,
            lastLoginAt: now,
          })
          .returning();
        adminUser = inserted[0];
      }

      await tx.insert(loginEvents).values({
        userId: adminUser.id,
        provider: 'password',
        roleAtLogin: 'administrador',
        loggedInAt: now,
      });

      return adminUser;
    });
  } catch (error) {
    console.error('Database error in ensureAdminUser:', error);
    throw new Error('No se pudo verificar la cuenta de administrador en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function getUserByUidOrEmail(
  uid: string,
  email: string
): Promise<DbUser | null> {
  try {
    const byUid = await getUserByUid(uid);
    if (byUid) {
      return byUid;
    }
    return await getUserByEmail(email);
  } catch (error) {
    console.error('Database error in getUserByUidOrEmail:', error);
    throw new Error('No se pudo verificar el usuario en PostgreSQL.', { cause: error });
  }
}

export async function registerGoogleUser(input: {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  turn: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos';
  assignedCourses: string[];
  assignedSubjects: string[] | null;
}): Promise<DbUser> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(users)
        .values({
          uid: input.uid,
          email: normalizedEmail,
          authProvider: 'google',
          name: input.name.trim(),
          role: input.role,
          turn: input.turn,
          assignedCourses: input.assignedCourses,
          assignedSubjects: input.assignedSubjects,
          lastLoginAt: now,
        })
        .returning();

      const createdUser = inserted[0];

      await tx.insert(loginEvents).values({
        userId: createdUser.id,
        provider: 'google',
        roleAtLogin: createdUser.role,
        loggedInAt: now,
      });

      return createdUser;
    });
  } catch (error) {
    console.error('Database error in registerGoogleUser:', error);
    throw new Error('No se pudo registrar la cuenta institucional en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    name?: string;
    role?: UserRole;
    turn?: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos';
    assignedCourses?: string[];
    assignedSubjects?: string[] | null;
  }
): Promise<DbUser> {
  try {
    const setData: Partial<typeof users.$inferInsert> = {};
    if (updates.name !== undefined) setData.name = updates.name;
    if (updates.role !== undefined) setData.role = updates.role;
    if (updates.turn !== undefined) setData.turn = updates.turn;
    if (updates.assignedCourses !== undefined) {
      setData.assignedCourses = updates.assignedCourses;
    }
    if (updates.assignedSubjects !== undefined) {
      setData.assignedSubjects = updates.assignedSubjects;
    }

    const updated = await db
      .update(users)
      .set(setData)
      .where(eq(users.uid, uid))
      .returning();

    if (updated.length === 0) {
      throw new Error('Usuario no encontrado en PostgreSQL.');
    }
    return updated[0];
  } catch (error) {
    console.error('Database error in updateUserProfile:', error);
    throw new Error('No se pudo actualizar el perfil docente en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function deleteUserAccount(dbUser: DbUser): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Sever teacher relationship with any assigned subjects/courses
      await tx
        .update(subjects)
        .set({ teacherId: null })
        .where(eq(subjects.teacherId, dbUser.uid));

      // Sever preceptor relationship if applicable
      await tx
        .update(courses)
        .set({ preceptorId: null })
        .where(eq(courses.preceptorId, dbUser.uid));

      // Detach active user reference from historical attendance sheets while keeping school records
      await tx
        .update(attendanceSheets)
        .set({
          userId: null,
          takenByUserId: 'cuenta-eliminada',
        })
        .where(
          or(
            eq(attendanceSheets.userId, dbUser.id),
            eq(attendanceSheets.takenByUserId, dbUser.uid)
          )
        );

      // Delete user account (login_events cascade automatically)
      await tx.delete(users).where(eq(users.id, dbUser.id));
    });
  } catch (error) {
    console.error('Database error in deleteUserAccount:', error);
    throw new Error('No se pudo eliminar la cuenta en PostgreSQL.', { cause: error });
  }
}

export async function createPasswordResetCode(input: {
  userId: number;
  email: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<number> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    return await db.transaction(async (tx) => {
      await tx
        .delete(passwordResetCodes)
        .where(
          and(
            eq(passwordResetCodes.userId, input.userId),
            isNull(passwordResetCodes.usedAt)
          )
        );

      const inserted = await tx
        .insert(passwordResetCodes)
        .values({
          userId: input.userId,
          email: normalizedEmail,
          codeHash: input.codeHash,
          expiresAt: input.expiresAt,
        })
        .returning({ id: passwordResetCodes.id });

      return inserted[0].id;
    });
  } catch (error) {
    console.error('Database error in createPasswordResetCode:', error);
    throw new Error('No se pudo generar el código de recuperación en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function invalidatePasswordResetCodeById(resetId: number): Promise<void> {
  try {
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.id, resetId));
  } catch {
    // ignore cleanup failure
  }
}

export async function verifyAndConsumePasswordResetCode(input: {
  email: string;
  code: string;
  newPasswordHash: string;
}): Promise<
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'too_many_attempts' | 'invalid_code' }
> {
  try {
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(passwordResetCodes)
        .where(
          and(
            eq(passwordResetCodes.email, normalizedEmail),
            isNull(passwordResetCodes.usedAt),
            gt(passwordResetCodes.expiresAt, now)
          )
        )
        .orderBy(desc(passwordResetCodes.createdAt))
        .limit(1);

      if (rows.length === 0) {
        return { ok: false, reason: 'not_found' };
      }

      const row = rows[0];
      if (row.attempts >= 5) {
        return { ok: false, reason: 'too_many_attempts' };
      }

      const valid = verifyResetCodeHash(input.code, row.codeHash);
      if (!valid) {
        await tx
          .update(passwordResetCodes)
          .set({ attempts: row.attempts + 1 })
          .where(eq(passwordResetCodes.id, row.id));
        return { ok: false, reason: 'invalid_code' };
      }

      await tx
        .update(passwordResetCodes)
        .set({ usedAt: now })
        .where(eq(passwordResetCodes.id, row.id));

      await tx
        .update(users)
        .set({ passwordHash: input.newPasswordHash })
        .where(eq(users.id, row.userId));

      return { ok: true };
    });
  } catch (error) {
    console.error('Database error in verifyAndConsumePasswordResetCode:', error);
    throw new Error('No se pudo actualizar la contraseña en PostgreSQL.', {
      cause: error,
    });
  }
}

export function mapDbUserToProfile(dbUser: DbUser): UserProfile {
  return {
    id: dbUser.uid,
    name: dbUser.name,
    email: dbUser.email,
    role:
      dbUser.role === 'administrador'
        ? 'administrador'
        : dbUser.role === 'preceptor'
        ? 'preceptor'
        : 'profesor',
    turn:
      dbUser.turn === 'Tarde' ||
      dbUser.turn === 'Noche' ||
      dbUser.turn === 'Ambos'
        ? dbUser.turn
        : 'Mañana',
    assignedCourses: Array.isArray(dbUser.assignedCourses)
      ? dbUser.assignedCourses
      : [],
    assignedSubjects: Array.isArray(dbUser.assignedSubjects)
      ? dbUser.assignedSubjects
      : undefined,
    authProvider: dbUser.authProvider === 'google' ? 'google' : 'password',
  };
}

export type DbRegistrationRequest = typeof registrationRequests.$inferSelect;

let registrationSchemaPromise: Promise<void> | null = null;

export async function ensureRegistrationRequestsTable(): Promise<void> {
  if (!registrationSchemaPromise) {
    registrationSchemaPromise = (async () => {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS registration_requests (
            id serial PRIMARY KEY,
            uid text,
            email text NOT NULL,
            password_hash text,
            auth_provider text NOT NULL DEFAULT 'password',
            name text NOT NULL,
            role text NOT NULL DEFAULT 'profesor',
            turn text NOT NULL DEFAULT 'Mañana',
            assigned_courses jsonb NOT NULL DEFAULT '[]'::jsonb,
            assigned_subjects jsonb,
            verification_code_hash text,
            verification_attempts integer NOT NULL DEFAULT 0,
            verification_expires_at timestamp,
            email_verified_at timestamp,
            status text NOT NULL DEFAULT 'pending_email',
            rejection_reason text,
            reviewed_by_uid text,
            reviewed_by_name text,
            reviewed_at timestamp,
            created_at timestamp NOT NULL DEFAULT now()
          );
        `);
      } catch (error) {
        registrationSchemaPromise = null;
        console.error('Failed to ensure registration_requests table:', error);
        throw new Error('No se pudo inicializar la tabla de solicitudes de registro.', {
          cause: error,
        });
      }
    })();
  }
  return registrationSchemaPromise;
}

export function mapDbRegistrationRequest(row: DbRegistrationRequest): RegistrationRequest {
  return {
    id: row.id,
    email: row.email,
    authProvider: row.authProvider === 'google' ? 'google' : 'password',
    name: row.name,
    role: row.role === 'preceptor' ? 'preceptor' : 'profesor',
    turn: row.turn === 'Tarde' ? 'Tarde' : 'Mañana',
    status:
      row.status === 'pending_approval' ||
      row.status === 'approved' ||
      row.status === 'rejected'
        ? row.status
        : 'pending_email',
    emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    reviewedByName: row.reviewedByName ?? undefined,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getLatestRegistrationRequestByEmail(
  email: string
): Promise<DbRegistrationRequest | null> {
  try {
    await ensureRegistrationRequestsTable();
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.email, normalizedEmail))
      .orderBy(desc(registrationRequests.createdAt), desc(registrationRequests.id))
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database error in getLatestRegistrationRequestByEmail:', error);
    throw new Error('No se pudo consultar la solicitud de registro en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function upsertPendingEmailRegistrationRequest(input: {
  uid: string | null;
  email: string;
  passwordHash: string | null;
  authProvider: 'password' | 'google';
  name: string;
  role: 'profesor' | 'preceptor';
  turn: 'Mañana' | 'Tarde';
  assignedCourses: string[];
  assignedSubjects: string[] | null;
  codeHash: string;
  expiresAt: Date;
}): Promise<number> {
  try {
    await ensureRegistrationRequestsTable();
    const normalizedEmail = input.email.trim().toLowerCase();

    return await db.transaction(async (tx) => {
      // Remove previous incomplete or rejected attempts for this email before creating a fresh verification code
      await tx
        .delete(registrationRequests)
        .where(
          and(
            eq(registrationRequests.email, normalizedEmail),
            or(
              eq(registrationRequests.status, 'pending_email'),
              eq(registrationRequests.status, 'rejected')
            )
          )
        );

      const inserted = await tx
        .insert(registrationRequests)
        .values({
          uid: input.uid,
          email: normalizedEmail,
          passwordHash: input.passwordHash,
          authProvider: input.authProvider,
          name: input.name.trim(),
          role: input.role,
          turn: input.turn,
          assignedCourses: input.assignedCourses,
          assignedSubjects: input.assignedSubjects,
          verificationCodeHash: input.codeHash,
          verificationAttempts: 0,
          verificationExpiresAt: input.expiresAt,
          status: 'pending_email',
        })
        .returning({ id: registrationRequests.id });

      return inserted[0].id;
    });
  } catch (error) {
    console.error('Database error in upsertPendingEmailRegistrationRequest:', error);
    throw new Error('No se pudo iniciar la solicitud de registro en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function invalidatePendingRegistrationRequestById(requestId: number): Promise<void> {
  try {
    await ensureRegistrationRequestsTable();
    await db
      .delete(registrationRequests)
      .where(
        and(
          eq(registrationRequests.id, requestId),
          eq(registrationRequests.status, 'pending_email')
        )
      );
  } catch {
    // ignore cleanup error
  }
}

export async function verifyRegistrationEmailCode(input: {
  email: string;
  code: string;
}): Promise<
  | { ok: true; request: DbRegistrationRequest }
  | {
      ok: false;
      reason: 'not_found' | 'too_many_attempts' | 'invalid_code' | 'already_verified';
    }
> {
  try {
    await ensureRegistrationRequestsTable();
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const latestRows = await tx
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.email, normalizedEmail))
        .orderBy(desc(registrationRequests.createdAt), desc(registrationRequests.id))
        .limit(1);

      if (latestRows.length === 0) {
        return { ok: false, reason: 'not_found' };
      }

      const row = latestRows[0];
      if (row.status === 'pending_approval' || row.status === 'approved') {
        return { ok: false, reason: 'already_verified' };
      }
      if (row.status !== 'pending_email' || !row.verificationCodeHash || !row.verificationExpiresAt) {
        return { ok: false, reason: 'not_found' };
      }
      if (row.verificationExpiresAt <= now) {
        return { ok: false, reason: 'not_found' };
      }
      if (row.verificationAttempts >= 5) {
        return { ok: false, reason: 'too_many_attempts' };
      }

      const valid = verifyResetCodeHash(input.code, row.verificationCodeHash);
      if (!valid) {
        await tx
          .update(registrationRequests)
          .set({ verificationAttempts: row.verificationAttempts + 1 })
          .where(eq(registrationRequests.id, row.id));
        return { ok: false, reason: 'invalid_code' };
      }

      const updated = await tx
        .update(registrationRequests)
        .set({
          emailVerifiedAt: now,
          status: 'pending_approval',
          verificationCodeHash: null,
          verificationExpiresAt: null,
        })
        .where(eq(registrationRequests.id, row.id))
        .returning();

      return { ok: true, request: updated[0] };
    });
  } catch (error) {
    console.error('Database error in verifyRegistrationEmailCode:', error);
    throw new Error('No se pudo verificar el código de registro en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  try {
    await ensureRegistrationRequestsTable();
    const rows = await db
      .select()
      .from(registrationRequests)
      .where(
        or(
          eq(registrationRequests.status, 'pending_approval'),
          eq(registrationRequests.status, 'approved'),
          eq(registrationRequests.status, 'rejected')
        )
      )
      .orderBy(desc(registrationRequests.createdAt), desc(registrationRequests.id));
    return rows.map(mapDbRegistrationRequest);
  } catch (error) {
    console.error('Database error in listRegistrationRequests:', error);
    throw new Error('No se pudieron obtener las solicitudes de registro.', { cause: error });
  }
}

export async function getPendingRegistrationRequestsCount(): Promise<number> {
  try {
    await ensureRegistrationRequestsTable();
    const rows = await db
      .select({ id: registrationRequests.id })
      .from(registrationRequests)
      .where(eq(registrationRequests.status, 'pending_approval'));
    return rows.length;
  } catch (error) {
    console.error('Database error in getPendingRegistrationRequestsCount:', error);
    return 0;
  }
}

export async function approveRegistrationRequest(input: {
  requestId: number;
  adminUid: string;
  adminName: string;
}): Promise<{ ok: true; request: RegistrationRequest } | { ok: false; reason: 'not_found' | 'not_pending' | 'already_exists' }> {
  try {
    await ensureRegistrationRequestsTable();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, input.requestId))
        .limit(1);

      if (rows.length === 0) {
        return { ok: false, reason: 'not_found' };
      }

      const reqRow = rows[0];
      if (reqRow.status !== 'pending_approval') {
        return { ok: false, reason: 'not_pending' };
      }

      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, reqRow.email))
        .limit(1);

      if (existingUser.length > 0) {
        return { ok: false, reason: 'already_exists' };
      }

      const resolvedUid =
        reqRow.authProvider === 'google' && reqRow.uid
          ? reqRow.uid
          : `local-${crypto.randomUUID()}`;

      await tx.insert(users).values({
        uid: resolvedUid,
        email: reqRow.email,
        passwordHash: reqRow.passwordHash,
        authProvider: reqRow.authProvider,
        name: reqRow.name,
        role: reqRow.role,
        turn: reqRow.turn,
        assignedCourses: Array.isArray(reqRow.assignedCourses) ? reqRow.assignedCourses : [],
        assignedSubjects: Array.isArray(reqRow.assignedSubjects) ? reqRow.assignedSubjects : null,
      });

      const updated = await tx
        .update(registrationRequests)
        .set({
          status: 'approved',
          reviewedByUid: input.adminUid,
          reviewedByName: input.adminName,
          reviewedAt: now,
        })
        .where(eq(registrationRequests.id, reqRow.id))
        .returning();

      return { ok: true, request: mapDbRegistrationRequest(updated[0]) };
    });
  } catch (error) {
    console.error('Database error in approveRegistrationRequest:', error);
    throw new Error('No se pudo aprobar la solicitud de registro.', { cause: error });
  }
}

export async function rejectRegistrationRequest(input: {
  requestId: number;
  adminUid: string;
  adminName: string;
  reason?: string;
}): Promise<{ ok: true; request: RegistrationRequest } | { ok: false; reason: 'not_found' | 'not_pending' }> {
  try {
    await ensureRegistrationRequestsTable();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(registrationRequests)
        .where(eq(registrationRequests.id, input.requestId))
        .limit(1);

      if (rows.length === 0) {
        return { ok: false, reason: 'not_found' };
      }

      const reqRow = rows[0];
      if (reqRow.status !== 'pending_approval') {
        return { ok: false, reason: 'not_pending' };
      }

      const updated = await tx
        .update(registrationRequests)
        .set({
          status: 'rejected',
          passwordHash: null,
          rejectionReason: input.reason?.trim() || null,
          reviewedByUid: input.adminUid,
          reviewedByName: input.adminName,
          reviewedAt: now,
        })
        .where(eq(registrationRequests.id, reqRow.id))
        .returning();

      return { ok: true, request: mapDbRegistrationRequest(updated[0]) };
    });
  } catch (error) {
    console.error('Database error in rejectRegistrationRequest:', error);
    throw new Error('No se pudo rechazar la solicitud de registro.', { cause: error });
  }
}

