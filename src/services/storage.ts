import type {
  Course,
  Subject,
  Student,
  UserProfile,
  AttendanceSheet,
  AttendanceStatus,
  StudentMonthlySummary,
} from '../types';
import {
  apiBulkDeleteAttendanceSheets,
  apiDeleteAttendanceSheet,
  apiDeleteStudent,
  apiFetchStudents,
  apiSaveAttendanceSheet,
  apiSaveStudent,
  type BootstrapPayload,
} from './api';

// In-memory store hydrated exclusively from PostgreSQL via Express API
let store: {
  currentUser: UserProfile | null;
  courses: Course[];
  subjects: Subject[];
  students: Student[];
  attendanceSheets: AttendanceSheet[];
} = {
  currentUser: null,
  courses: [],
  subjects: [],
  students: [],
  attendanceSheets: [],
};

export function hydrateStorageFromServer(payload: BootstrapPayload): void {
  store = {
    currentUser: payload.user,
    courses: payload.courses,
    subjects: payload.subjects,
    students: payload.students,
    attendanceSheets: payload.attendanceSheets,
  };
}

export function clearStorageSession(): void {
  store = {
    currentUser: null,
    courses: [],
    subjects: [],
    students: [],
    attendanceSheets: [],
  };
}

export function getCurrentUser(): UserProfile | null {
  return store.currentUser;
}

export function setCurrentUser(user: UserProfile | null): void {
  store.currentUser = user;
}

export function getCourses(): Course[] {
  return store.courses;
}

export function getSubjects(): Subject[] {
  return store.subjects;
}

export function getSubjectsForCourse(courseId: string): Subject[] {
  return store.subjects.filter((s) => s.courseId === courseId || s.courseId === 'all');
}

// User-specific subject access:
// PRECEPTORES: ONLY take 'sub-general' (Asistencia General de Preceptoría). Cannot take specific subjects.
// PROFESORES: ONLY take their assigned subjects. Cannot take 'sub-general'.
export function getAvailableSubjectsForUser(user: UserProfile, courseId: string): Subject[] {
  const all = store.subjects;
  const courseSubjects = all.filter((s) => s.courseId === courseId || s.courseId === 'all');

  const generalSub = all.find((s) => s.id === 'sub-general') || {
    id: 'sub-general',
    name: 'Asistencia General (Preceptoría / Entrada)',
    courseId: 'all',
  };

  if (user.role === 'administrador') {
    const curricular = courseSubjects.filter(
      (s) => s.id !== 'sub-general' && s.courseId !== 'all'
    );
    return [generalSub, ...curricular];
  }

  if (user.role === 'preceptor') {
    return [generalSub];
  }

  const curricularSubjects = courseSubjects.filter(
    (s) => s.id !== 'sub-general' && s.courseId !== 'all'
  );

  if (user.assignedSubjects && user.assignedSubjects.length > 0) {
    const teacherSubs = curricularSubjects.filter(
      (s) => user.assignedSubjects?.includes(s.id) || s.teacherId === user.id
    );
    if (teacherSubs.length > 0) {
      return teacherSubs;
    }
  }

  const byTeacherId = curricularSubjects.filter((s) => s.teacherId === user.id);
  if (byTeacherId.length > 0) {
    return byTeacherId;
  }

  return curricularSubjects;
}

export function getAvailableCoursesForUser(user: UserProfile): Course[] {
  const allCourses = store.courses;
  if (user.role === 'preceptor' || user.role === 'administrador') {
    return allCourses;
  }

  if (user.assignedSubjects && user.assignedSubjects.length > 0) {
    const allSubs = store.subjects;
    const teacherCourseIds = new Set(
      allSubs
        .filter((s) => user.assignedSubjects?.includes(s.id) || s.teacherId === user.id)
        .map((s) => s.courseId)
    );

    if (teacherCourseIds.size > 0) {
      return allCourses.filter((c) => teacherCourseIds.has(c.id));
    }
  }

  if (user.assignedCourses && user.assignedCourses.length > 0) {
    const userCourses = allCourses.filter((c) => user.assignedCourses.includes(c.id));
    if (userCourses.length > 0) return userCourses;
  }

  return allCourses;
}

// Students
export function getStudents(): Student[] {
  return store.students;
}

export function getStudentsByCourse(courseId: string): Student[] {
  return store.students
    .filter((s) => s.courseId === courseId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'es'));
}

export async function syncStudentsFromServer(): Promise<Student[]> {
  const fresh = await apiFetchStudents();
  store.students = fresh;
  return fresh;
}

export async function saveStudent(student: Student): Promise<Student> {
  const saved = await apiSaveStudent(student);
  const index = store.students.findIndex((s) => s.id === saved.id);
  if (index >= 0) {
    store.students[index] = saved;
  } else {
    store.students = [...store.students, saved];
  }
  return saved;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await apiDeleteStudent(studentId);
  store.students = store.students.filter((s) => s.id !== studentId);
}

// Attendance
export function getAllAttendanceSheets(): AttendanceSheet[] {
  return store.attendanceSheets;
}

export async function saveAttendanceSheet(sheet: AttendanceSheet): Promise<AttendanceSheet> {
  const saved = await apiSaveAttendanceSheet(sheet);
  const existingIdx = store.attendanceSheets.findIndex(
    (s) =>
      s.date === saved.date &&
      s.courseId === saved.courseId &&
      s.subjectId === saved.subjectId
  );

  if (existingIdx >= 0) {
    const copy = [...store.attendanceSheets];
    copy[existingIdx] = saved;
    store.attendanceSheets = copy;
  } else {
    store.attendanceSheets = [saved, ...store.attendanceSheets];
  }

  return saved;
}

export async function deleteAttendanceSheet(sheetId: string): Promise<void> {
  await apiDeleteAttendanceSheet(sheetId);
  store.attendanceSheets = store.attendanceSheets.filter((s) => s.id !== sheetId);
}

export async function deleteAttendanceSheets(sheetIds: string[]): Promise<number> {
  const result = await apiBulkDeleteAttendanceSheets(sheetIds);
  const deletedSet = new Set(result.deletedIds);
  store.attendanceSheets = store.attendanceSheets.filter((s) => !deletedSet.has(s.id));
  return result.deletedCount;
}

export function findAttendanceSheet(
  date: string,
  courseId: string,
  subjectId: string
): AttendanceSheet | undefined {
  return store.attendanceSheets.find(
    (s) => s.date === date && s.courseId === courseId && s.subjectId === subjectId
  );
}

export function calculateMonthlyReport(
  courseId: string,
  year: number,
  month: number,
  subjectId?: string
): {
  studentsSummary: StudentMonthlySummary[];
  schoolDaysWithData: number[];
  totalClasses: number;
} {
  const students = getStudentsByCourse(courseId);
  const allSheets = getAllAttendanceSheets();

  const monthStr = month.toString().padStart(2, '0');
  const yearMonthPrefix = `${year}-${monthStr}`;

  const matchingSheets = allSheets.filter((sheet) => {
    if (sheet.courseId !== courseId) return false;
    if (!sheet.date.startsWith(yearMonthPrefix)) return false;
    if (subjectId && subjectId !== 'all') {
      return sheet.subjectId === subjectId;
    }
    return true;
  });

  const daysRecorded = Array.from(
    new Set(matchingSheets.map((s) => parseInt(s.date.split('-')[2], 10)))
  ).sort((a, b) => a - b);

  const studentsSummary: StudentMonthlySummary[] = students.map((student) => {
    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;
    let tardanzas = 0;
    const dailyStatus: Record<number, AttendanceStatus | undefined> = {};

    daysRecorded.forEach((day) => {
      const dayDate = `${yearMonthPrefix}-${day.toString().padStart(2, '0')}`;
      const daySheets = matchingSheets.filter((s) => s.date === dayDate);
      if (daySheets.length === 0) return;

      const preferredSheet =
        daySheets.find((s) => s.subjectId === (subjectId || 'sub-general')) ||
        daySheets[0];
      const entry = preferredSheet.entries.find((e) => e.studentId === student.id);

      if (entry) {
        dailyStatus[day] = entry.status;
        if (entry.status === 'presente') presentes++;
        else if (entry.status === 'ausente') ausentes++;
        else if (entry.status === 'justificado') justificados++;
        else if (entry.status === 'tardanza') tardanzas++;
      }
    });

    const totalFaltasComputadas = ausentes + tardanzas * 0.5;
    const totalEvaluated = presentes + ausentes + justificados + tardanzas;
    const porcentajeAsistencia =
      totalEvaluated > 0
        ? Math.round(((presentes + justificados) / totalEvaluated) * 100)
        : 100;

    let alertaFaltas: 'normal' | 'advertencia' | 'critico' = 'normal';
    if (totalFaltasComputadas >= 25) {
      alertaFaltas = 'critico';
    } else if (totalFaltasComputadas >= 18) {
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
}
