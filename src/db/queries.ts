import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  attendanceEntries,
  attendanceSheets,
  courses,
  students,
  subjects,
} from './schema.ts';
import {
  SEED_COURSES,
  SEED_STUDENTS,
  SEED_SUBJECTS,
  generateSeedAttendanceSheets,
} from './seedData.ts';
import type {
  AttendanceEntry,
  AttendanceSheet,
  AttendanceStatus,
  Course,
  Student,
  StudentMonthlySummary,
  Subject,
} from '../types/index.ts';

let catalogSeededPromise: Promise<void> | null = null;

export async function ensureInitialCatalogSeeded(): Promise<void> {
  if (!catalogSeededPromise) {
    catalogSeededPromise = (async () => {
      try {
        await db.execute(sql`
          ALTER TABLE attendance_sheets
            ADD COLUMN IF NOT EXISTS last_edited_by_user_id text,
            ADD COLUMN IF NOT EXISTS last_edited_by_user_name text,
            ADD COLUMN IF NOT EXISTS last_edited_by_role text,
            ADD COLUMN IF NOT EXISTS last_edited_at timestamp;
        `);

        const existingCourses = await db.select({ id: courses.id }).from(courses).limit(1);
        if (existingCourses.length > 0) {
          return;
        }

        await db.transaction(async (tx) => {
          const checkAgain = await tx.select({ id: courses.id }).from(courses).limit(1);
          if (checkAgain.length > 0) return;

          await tx
            .insert(courses)
            .values(
              SEED_COURSES.map((c) => ({
                id: c.id,
                name: c.name,
                specialty: c.specialty ?? null,
                cycle: c.cycle,
                turn: c.turn,
                preceptorId: c.preceptorId ?? null,
              }))
            )
            .onConflictDoNothing();

          await tx
            .insert(subjects)
            .values(
              SEED_SUBJECTS.map((s) => ({
                id: s.id,
                name: s.name,
                courseId: s.courseId,
                teacherId: s.teacherId ?? null,
                weeklyHours: s.weeklyHours ?? null,
              }))
            )
            .onConflictDoNothing();

          await tx
            .insert(students)
            .values(
              SEED_STUDENTS.map((st) => ({
                id: st.id,
                dni: st.dni,
                lastName: st.lastName,
                firstName: st.firstName,
                courseId: st.courseId,
                guardianName: st.guardianName ?? null,
                guardianPhone: st.guardianPhone ?? null,
                email: st.email ?? null,
              }))
            )
            .onConflictDoNothing();

          const seedSheets = generateSeedAttendanceSheets();
          for (const sheet of seedSheets) {
            await tx
              .insert(attendanceSheets)
              .values({
                id: sheet.id,
                date: sheet.date,
                courseId: sheet.courseId,
                subjectId: sheet.subjectId,
                turn: sheet.turn,
                userId: null,
                takenByUserId: sheet.takenByUserId,
                takenByUserName: sheet.takenByUserName,
                takenByRole: sheet.takenByRole,
                notes: sheet.notes ?? null,
                timestamp: new Date(sheet.timestamp),
              })
              .onConflictDoNothing();

            if (sheet.entries.length > 0) {
              await tx
                .insert(attendanceEntries)
                .values(
                  sheet.entries.map((entry) => ({
                    sheetId: sheet.id,
                    studentId: entry.studentId,
                    status: entry.status,
                    observation: entry.observation ?? null,
                  }))
                )
                .onConflictDoNothing();
            }
          }
        });
      } catch (error) {
        catalogSeededPromise = null;
        console.error('Database seed failed:', error);
        throw new Error('Error inicializando datos escolares en PostgreSQL.', {
          cause: error,
        });
      }
    })();
  }
  return catalogSeededPromise;
}

export async function getAllCourses(): Promise<Course[]> {
  try {
    await ensureInitialCatalogSeeded();
    const rows = await db.select().from(courses).orderBy(asc(courses.id));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      specialty: r.specialty ?? undefined,
      cycle: r.cycle === 'Ciclo Especialidad' ? 'Ciclo Especialidad' : 'Ciclo Básico',
      turn: r.turn === 'Tarde' ? 'Tarde' : 'Mañana',
      preceptorId: r.preceptorId ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in getAllCourses:', error);
    throw new Error('No se pudieron obtener los cursos desde PostgreSQL.', {
      cause: error,
    });
  }
}

export async function getAllSubjects(): Promise<Subject[]> {
  try {
    await ensureInitialCatalogSeeded();
    const rows = await db.select().from(subjects).orderBy(asc(subjects.id));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      courseId: r.courseId,
      teacherId: r.teacherId ?? undefined,
      weeklyHours: r.weeklyHours ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in getAllSubjects:', error);
    throw new Error('No se pudieron obtener las materias desde PostgreSQL.', {
      cause: error,
    });
  }
}

export async function getAllStudents(courseId?: string): Promise<Student[]> {
  try {
    await ensureInitialCatalogSeeded();
    const rows = courseId
      ? await db
          .select()
          .from(students)
          .where(eq(students.courseId, courseId))
          .orderBy(asc(students.lastName), asc(students.firstName))
      : await db
          .select()
          .from(students)
          .orderBy(asc(students.lastName), asc(students.firstName));

    return rows.map((r) => ({
      id: r.id,
      dni: r.dni,
      lastName: r.lastName,
      firstName: r.firstName,
      courseId: r.courseId,
      guardianName: r.guardianName ?? undefined,
      guardianPhone: r.guardianPhone ?? undefined,
      email: r.email ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in getAllStudents:', error);
    throw new Error('No se pudieron obtener los alumnos desde PostgreSQL.', {
      cause: error,
    });
  }
}

export async function createOrUpdateStudent(student: Student): Promise<Student> {
  try {
    const inserted = await db
      .insert(students)
      .values({
        id: student.id,
        dni: student.dni,
        lastName: student.lastName,
        firstName: student.firstName,
        courseId: student.courseId,
        guardianName: student.guardianName ?? null,
        guardianPhone: student.guardianPhone ?? null,
        email: student.email ?? null,
      })
      .onConflictDoUpdate({
        target: students.id,
        set: {
          dni: student.dni,
          lastName: student.lastName,
          firstName: student.firstName,
          courseId: student.courseId,
          guardianName: student.guardianName ?? null,
          guardianPhone: student.guardianPhone ?? null,
          email: student.email ?? null,
        },
      })
      .returning();

    const r = inserted[0];
    return {
      id: r.id,
      dni: r.dni,
      lastName: r.lastName,
      firstName: r.firstName,
      courseId: r.courseId,
      guardianName: r.guardianName ?? undefined,
      guardianPhone: r.guardianPhone ?? undefined,
      email: r.email ?? undefined,
    };
  } catch (error) {
    console.error('Database mutation failed in createOrUpdateStudent:', error);
    throw new Error('No se pudo guardar el alumno en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function deleteStudentById(studentId: string): Promise<void> {
  try {
    await db.delete(students).where(eq(students.id, studentId));
  } catch (error) {
    console.error('Database delete failed in deleteStudentById:', error);
    throw new Error('No se pudo eliminar el alumno de PostgreSQL.', {
      cause: error,
    });
  }
}

export async function getAllAttendanceSheets(filters?: {
  courseId?: string;
  date?: string;
  subjectId?: string;
  takenByUserId?: string;
}): Promise<AttendanceSheet[]> {
  try {
    await ensureInitialCatalogSeeded();

    const conditions = [];
    if (filters?.courseId) {
      conditions.push(eq(attendanceSheets.courseId, filters.courseId));
    }
    if (filters?.date) {
      conditions.push(eq(attendanceSheets.date, filters.date));
    }
    if (filters?.subjectId) {
      conditions.push(eq(attendanceSheets.subjectId, filters.subjectId));
    }
    if (filters?.takenByUserId) {
      conditions.push(eq(attendanceSheets.takenByUserId, filters.takenByUserId));
    }

    const sheetRows =
      conditions.length > 0
        ? await db
            .select()
            .from(attendanceSheets)
            .where(and(...conditions))
            .orderBy(desc(attendanceSheets.date), desc(attendanceSheets.timestamp))
        : await db
            .select()
            .from(attendanceSheets)
            .orderBy(desc(attendanceSheets.date), desc(attendanceSheets.timestamp));

    if (sheetRows.length === 0) return [];

    const sheetIds = sheetRows.map((s) => s.id);
    const entryRows = await db
      .select()
      .from(attendanceEntries)
      .where(inArray(attendanceEntries.sheetId, sheetIds));

    const entriesBySheet = new Map<string, AttendanceEntry[]>();
    for (const e of entryRows) {
      const list = entriesBySheet.get(e.sheetId) ?? [];
      list.push({
        studentId: e.studentId,
        status: e.status as AttendanceStatus,
        observation: e.observation ?? undefined,
      });
      entriesBySheet.set(e.sheetId, list);
    }

    return sheetRows.map((s) => ({
      id: s.id,
      date: s.date,
      courseId: s.courseId,
      subjectId: s.subjectId,
      turn: s.turn === 'Tarde' ? 'Tarde' : 'Mañana',
      takenByUserId: s.takenByUserId,
      takenByUserName: s.takenByUserName,
      takenByRole:
        s.takenByRole === 'administrador'
          ? 'administrador'
          : s.takenByRole === 'preceptor'
          ? 'preceptor'
          : 'profesor',
      lastEditedByUserId: s.lastEditedByUserId ?? undefined,
      lastEditedByUserName: s.lastEditedByUserName ?? undefined,
      lastEditedByRole:
        s.lastEditedByRole === 'administrador'
          ? 'administrador'
          : s.lastEditedByRole === 'preceptor'
          ? 'preceptor'
          : s.lastEditedByRole === 'profesor'
          ? 'profesor'
          : undefined,
      lastEditedAt: s.lastEditedAt ? s.lastEditedAt.toISOString() : undefined,
      entries: entriesBySheet.get(s.id) ?? [],
      timestamp: s.timestamp.toISOString(),
      notes: s.notes ?? undefined,
    }));
  } catch (error) {
    console.error('Database query failed in getAllAttendanceSheets:', error);
    throw new Error('No se pudieron obtener las planillas de asistencia desde PostgreSQL.', {
      cause: error,
    });
  }
}

export async function upsertAttendanceSheet(
  sheet: AttendanceSheet,
  dbUserId: number
): Promise<AttendanceSheet> {
  try {
    await ensureInitialCatalogSeeded();
    return await db.transaction(async (tx) => {
      // Find existing by (date, courseId, subjectId) to preserve canonical sheet id if present
      const existing = await tx
        .select()
        .from(attendanceSheets)
        .where(
          and(
            eq(attendanceSheets.date, sheet.date),
            eq(attendanceSheets.courseId, sheet.courseId),
            eq(attendanceSheets.subjectId, sheet.subjectId)
          )
        )
        .limit(1);

      const isExisting = existing.length > 0;
      const targetSheetId = isExisting ? existing[0].id : sheet.id;
      const preserveCreator = isExisting && sheet.takenByRole === 'administrador';
      const resolvedUserId = preserveCreator ? existing[0].userId : dbUserId;
      const resolvedTakenByUserId = preserveCreator ? existing[0].takenByUserId : sheet.takenByUserId;
      const resolvedTakenByUserName = preserveCreator ? existing[0].takenByUserName : sheet.takenByUserName;
      const resolvedTakenByRole = preserveCreator ? existing[0].takenByRole : sheet.takenByRole;
      const now = new Date();

      const resolvedLastEditedByUserId = isExisting ? sheet.takenByUserId : null;
      const resolvedLastEditedByUserName = isExisting ? sheet.takenByUserName : null;
      const resolvedLastEditedByRole = isExisting ? sheet.takenByRole : null;
      const resolvedLastEditedAt = isExisting ? now : null;

      await tx
        .insert(attendanceSheets)
        .values({
          id: targetSheetId,
          date: sheet.date,
          courseId: sheet.courseId,
          subjectId: sheet.subjectId,
          turn: sheet.turn,
          userId: resolvedUserId,
          takenByUserId: resolvedTakenByUserId,
          takenByUserName: resolvedTakenByUserName,
          takenByRole: resolvedTakenByRole,
          lastEditedByUserId: resolvedLastEditedByUserId,
          lastEditedByUserName: resolvedLastEditedByUserName,
          lastEditedByRole: resolvedLastEditedByRole,
          lastEditedAt: resolvedLastEditedAt,
          notes: sheet.notes ?? null,
          timestamp: now,
        })
        .onConflictDoUpdate({
          target: attendanceSheets.id,
          set: {
            turn: sheet.turn,
            userId: resolvedUserId,
            takenByUserId: resolvedTakenByUserId,
            takenByUserName: resolvedTakenByUserName,
            takenByRole: resolvedTakenByRole,
            lastEditedByUserId: resolvedLastEditedByUserId,
            lastEditedByUserName: resolvedLastEditedByUserName,
            lastEditedByRole: resolvedLastEditedByRole,
            lastEditedAt: resolvedLastEditedAt,
            notes: sheet.notes ?? null,
            timestamp: now,
          },
        });

      await tx
        .delete(attendanceEntries)
        .where(eq(attendanceEntries.sheetId, targetSheetId));

      if (sheet.entries.length > 0) {
        await tx.insert(attendanceEntries).values(
          sheet.entries.map((e) => ({
            sheetId: targetSheetId,
            studentId: e.studentId,
            status: e.status,
            observation: e.observation ?? null,
          }))
        );
      }

      return {
        ...sheet,
        id: targetSheetId,
        takenByUserId: resolvedTakenByUserId,
        takenByUserName: resolvedTakenByUserName,
        takenByRole:
          resolvedTakenByRole === 'administrador'
            ? 'administrador'
            : resolvedTakenByRole === 'preceptor'
            ? 'preceptor'
            : 'profesor',
        lastEditedByUserId: resolvedLastEditedByUserId ?? undefined,
        lastEditedByUserName: resolvedLastEditedByUserName ?? undefined,
        lastEditedByRole:
          resolvedLastEditedByRole === 'administrador'
            ? 'administrador'
            : resolvedLastEditedByRole === 'preceptor'
            ? 'preceptor'
            : resolvedLastEditedByRole === 'profesor'
            ? 'profesor'
            : undefined,
        lastEditedAt: resolvedLastEditedAt ? resolvedLastEditedAt.toISOString() : undefined,
        timestamp: now.toISOString(),
      };
    });
  } catch (error) {
    console.error('Database transaction failed in upsertAttendanceSheet:', error);
    throw new Error('No se pudo guardar la planilla de asistencia en PostgreSQL.', {
      cause: error,
    });
  }
}

export async function getAttendanceSheetByKey(
  date: string,
  courseId: string,
  subjectId: string
): Promise<{
  id: string;
  takenByUserId: string;
  takenByRole: string;
} | null> {
  try {
    const rows = await db
      .select({
        id: attendanceSheets.id,
        takenByUserId: attendanceSheets.takenByUserId,
        takenByRole: attendanceSheets.takenByRole,
      })
      .from(attendanceSheets)
      .where(
        and(
          eq(attendanceSheets.date, date),
          eq(attendanceSheets.courseId, courseId),
          eq(attendanceSheets.subjectId, subjectId)
        )
      )
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database query failed in getAttendanceSheetByKey:', error);
    throw new Error('No se pudo verificar la planilla de asistencia.', { cause: error });
  }
}

export async function getAttendanceSheetById(
  sheetId: string
): Promise<{
  id: string;
  subjectId: string;
  takenByUserId: string;
  takenByRole: string;
} | null> {
  try {
    const rows = await db
      .select({
        id: attendanceSheets.id,
        subjectId: attendanceSheets.subjectId,
        takenByUserId: attendanceSheets.takenByUserId,
        takenByRole: attendanceSheets.takenByRole,
      })
      .from(attendanceSheets)
      .where(eq(attendanceSheets.id, sheetId))
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Database query failed in getAttendanceSheetById:', error);
    throw new Error('No se pudo consultar la planilla de asistencia.', { cause: error });
  }
}

export async function deleteAttendanceSheetById(sheetId: string): Promise<void> {
  try {
    await db.delete(attendanceSheets).where(eq(attendanceSheets.id, sheetId));
  } catch (error) {
    console.error('Database delete failed in deleteAttendanceSheetById:', error);
    throw new Error('No se pudo eliminar la planilla de asistencia.', {
      cause: error,
    });
  }
}

export async function getAttendanceSheetsByIds(
  sheetIds: string[]
): Promise<
  Array<{
    id: string;
    subjectId: string;
    takenByUserId: string;
    takenByRole: string;
  }>
> {
  if (sheetIds.length === 0) return [];
  try {
    return await db
      .select({
        id: attendanceSheets.id,
        subjectId: attendanceSheets.subjectId,
        takenByUserId: attendanceSheets.takenByUserId,
        takenByRole: attendanceSheets.takenByRole,
      })
      .from(attendanceSheets)
      .where(inArray(attendanceSheets.id, sheetIds));
  } catch (error) {
    console.error('Database query failed in getAttendanceSheetsByIds:', error);
    throw new Error('No se pudieron consultar las planillas seleccionadas.', {
      cause: error,
    });
  }
}

export async function deleteAttendanceSheetsByIds(sheetIds: string[]): Promise<number> {
  if (sheetIds.length === 0) return 0;
  try {
    const deleted = await db
      .delete(attendanceSheets)
      .where(inArray(attendanceSheets.id, sheetIds))
      .returning({ id: attendanceSheets.id });
    return deleted.length;
  } catch (error) {
    console.error('Database delete failed in deleteAttendanceSheetsByIds:', error);
    throw new Error('No se pudieron eliminar las planillas seleccionadas.', {
      cause: error,
    });
  }
}

export async function getMonthlyReportFromDb(
  courseId: string,
  year: number,
  month: number,
  subjectId?: string
): Promise<{
  studentsSummary: StudentMonthlySummary[];
  schoolDaysWithData: number[];
  totalClasses: number;
}> {
  try {
    await ensureInitialCatalogSeeded();

    const courseStudents = await getAllStudents(courseId);
    const monthStr = month.toString().padStart(2, '0');
    const yearMonthPrefix = `${year}-${monthStr}`;

    const conditions = [
      eq(attendanceSheets.courseId, courseId),
      like(attendanceSheets.date, `${yearMonthPrefix}-%`),
    ];
    if (subjectId && subjectId !== 'all') {
      conditions.push(eq(attendanceSheets.subjectId, subjectId));
    }

    const matchingSheetRows = await db
      .select()
      .from(attendanceSheets)
      .where(and(...conditions));

    const sheetIds = matchingSheetRows.map((s) => s.id);
    const entryRows =
      sheetIds.length > 0
        ? await db
            .select()
            .from(attendanceEntries)
            .where(inArray(attendanceEntries.sheetId, sheetIds))
        : [];

    const entriesMap = new Map<string, Map<string, AttendanceStatus>>();
    for (const e of entryRows) {
      let map = entriesMap.get(e.sheetId);
      if (!map) {
        map = new Map();
        entriesMap.set(e.sheetId, map);
      }
      map.set(e.studentId, e.status as AttendanceStatus);
    }

    const daysRecorded = Array.from(
      new Set(matchingSheetRows.map((s) => parseInt(s.date.split('-')[2], 10)))
    ).sort((a, b) => a - b);

    const studentsSummary: StudentMonthlySummary[] = courseStudents.map((student) => {
      let presentes = 0;
      let ausentes = 0;
      let justificados = 0;
      let tardanzas = 0;
      const dailyStatus: Record<number, AttendanceStatus | undefined> = {};

      daysRecorded.forEach((day) => {
        const dayDate = `${yearMonthPrefix}-${day.toString().padStart(2, '0')}`;
        const daySheets = matchingSheetRows.filter((s) => s.date === dayDate);
        if (daySheets.length === 0) return;

        const preferredSheet =
          daySheets.find((s) => s.subjectId === (subjectId || 'sub-general')) ||
          daySheets[0];

        const status = entriesMap.get(preferredSheet.id)?.get(student.id);
        if (status) {
          dailyStatus[day] = status;
          if (status === 'presente') presentes++;
          else if (status === 'ausente') ausentes++;
          else if (status === 'justificado') justificados++;
          else if (status === 'tardanza') tardanzas++;
        }
      });

      const totalFaltasComputadas = ausentes + justificados + tardanzas * 0.5;
      const totalEvaluated = presentes + ausentes + justificados + tardanzas;
      const porcentajeAsistencia =
        totalEvaluated > 0
          ? Math.round((presentes / totalEvaluated) * 100)
          : 100;

      let alertaFaltas: 'normal' | 'advertencia' | 'critico' = 'normal';
      if (totalFaltasComputadas >= 25) {
        alertaFaltas = 'critico';
      } else if (totalFaltasComputadas >= 5) {
        alertaFaltas = 'advertencia';
      }

      return {
        student,
        presentes,
        ausentes,
        justificados,
        tardanzas,
        totalFaltasComputadas,
        porcentajeAsistencia,
        alertaFaltas,
        dailyStatus,
      };
    });

    return {
      studentsSummary,
      schoolDaysWithData: daysRecorded,
      totalClasses: daysRecorded.length,
    };
  } catch (error) {
    console.error('Database query failed in getMonthlyReportFromDb:', error);
    throw new Error('No se pudo calcular la planilla mensual desde PostgreSQL.', {
      cause: error,
    });
  }
}
