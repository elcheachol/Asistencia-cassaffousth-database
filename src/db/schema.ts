import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: text('auth_provider').notNull().default('password'),
  name: text('name').notNull(),
  role: text('role').notNull().default('profesor'),
  turn: text('turn').notNull().default('Mañana'),
  assignedCourses: jsonb('assigned_courses').$type<string[]>().notNull().default([]),
  assignedSubjects: jsonb('assigned_subjects').$type<string[] | null>(),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const loginEvents = pgTable('login_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  roleAtLogin: text('role_at_login').notNull(),
  loggedInAt: timestamp('logged_in_at').defaultNow().notNull(),
});

export const passwordResetCodes = pgTable('password_reset_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  specialty: text('specialty'),
  cycle: text('cycle').notNull(),
  turn: text('turn').notNull(),
  preceptorId: text('preceptor_id'),
});

export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  courseId: text('course_id').notNull(),
  teacherId: text('teacher_id'),
  weeklyHours: integer('weekly_hours'),
});

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  dni: text('dni').notNull(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const attendanceSheets = pgTable(
  'attendance_sheets',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    courseId: text('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    subjectId: text('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    turn: text('turn').notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    takenByUserId: text('taken_by_user_id').notNull(),
    takenByUserName: text('taken_by_user_name').notNull(),
    takenByRole: text('taken_by_role').notNull(),
    notes: text('notes'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('attendance_sheets_date_course_subject_idx').on(
      table.date,
      table.courseId,
      table.subjectId
    ),
  ]
);

export const attendanceEntries = pgTable(
  'attendance_entries',
  {
    id: serial('id').primaryKey(),
    sheetId: text('sheet_id')
      .notNull()
      .references(() => attendanceSheets.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    observation: text('observation'),
  },
  (table) => [
    uniqueIndex('attendance_entries_sheet_student_idx').on(
      table.sheetId,
      table.studentId
    ),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  attendanceSheets: many(attendanceSheets),
  loginEvents: many(loginEvents),
  passwordResetCodes: many(passwordResetCodes),
}));

export const loginEventsRelations = relations(loginEvents, ({ one }) => ({
  user: one(users, {
    fields: [loginEvents.userId],
    references: [users.id],
  }),
}));

export const passwordResetCodesRelations = relations(passwordResetCodes, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetCodes.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  students: many(students),
  attendanceSheets: many(attendanceSheets),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  attendanceSheets: many(attendanceSheets),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  course: one(courses, {
    fields: [students.courseId],
    references: [courses.id],
  }),
  attendanceEntries: many(attendanceEntries),
}));

export const attendanceSheetsRelations = relations(attendanceSheets, ({ one, many }) => ({
  course: one(courses, {
    fields: [attendanceSheets.courseId],
    references: [courses.id],
  }),
  subject: one(subjects, {
    fields: [attendanceSheets.subjectId],
    references: [subjects.id],
  }),
  author: one(users, {
    fields: [attendanceSheets.userId],
    references: [users.id],
  }),
  entries: many(attendanceEntries),
}));

export const attendanceEntriesRelations = relations(attendanceEntries, ({ one }) => ({
  sheet: one(attendanceSheets, {
    fields: [attendanceEntries.sheetId],
    references: [attendanceSheets.id],
  }),
  student: one(students, {
    fields: [attendanceEntries.studentId],
    references: [students.id],
  }),
}));
