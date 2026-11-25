import { auth } from '../lib/firebase';
import type {
  AttendanceSheet,
  Course,
  RegistrationRequest,
  Student,
  StudentMonthlySummary,
  Subject,
  UserProfile,
  UserRole,
} from '../types';

export interface BootstrapPayload {
  user: UserProfile;
  courses: Course[];
  subjects: Subject[];
  students: Student[];
  attendanceSheets: AttendanceSheet[];
  pendingRegistrationRequestsCount?: number;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

// Held strictly in JS memory (never in localStorage or sessionStorage)
let inMemorySessionToken: string | null = null;
let suppressFirebaseAuthListener = false;

export function setInMemorySessionToken(token: string | null): void {
  inMemorySessionToken = token;
}

export function getInMemorySessionToken(): string | null {
  return inMemorySessionToken;
}

export function setSuppressFirebaseAuthListener(suppress: boolean): void {
  suppressFirebaseAuthListener = suppress;
}

export function isFirebaseAuthListenerSuppressed(): boolean {
  return suppressFirebaseAuthListener;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'ipet247-spa',
  };

  if (inMemorySessionToken) {
    return {
      ...baseHeaders,
      Authorization: `Bearer ${inMemorySessionToken}`,
    };
  }

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  // Fallback to persistent HttpOnly session cookie attached via credentials: 'include'
  return baseHeaders;
}

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ipet247-spa',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : `Error ${response.status} al comunicarse con el servidor.`;
    throw new Error(message);
  }
  return data as T;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Error ${response.status} al comunicarse con el servidor.`;
    try {
      const body = await response.json();
      if (body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function apiSendRegistrationGmailCode(input: {
  firebaseIdToken?: string;
  authProvider: 'password' | 'google';
  email?: string;
  password?: string;
  name: string;
  role: UserRole;
  turn: 'Mañana' | 'Tarde';
}): Promise<{ sent: boolean; email: string; expiresInMinutes: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'ipet247-spa',
  };
  if (input.firebaseIdToken) {
    headers.Authorization = `Bearer ${input.firebaseIdToken}`;
  }

  const response = await fetch('/api/auth/register/send-code', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      authProvider: input.authProvider,
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      turn: input.turn,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : `Error ${response.status} al enviar el código de verificación.`;
    throw new Error(message);
  }
  return data as { sent: boolean; email: string; expiresInMinutes: number };
}

export function apiVerifyRegistrationGmailCode(input: {
  email: string;
  code: string;
}): Promise<{
  verified: boolean;
  pendingApproval: boolean;
  adminNotifiedByEmail: boolean;
  message: string;
}> {
  return publicPost('/api/auth/register/verify-code', input);
}

export async function apiRegister(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  turn: 'Mañana' | 'Tarde';
}): Promise<AuthResponse> {
  const result = await publicPost<AuthResponse>('/api/auth/register', input);
  setInMemorySessionToken(result.token);
  return result;
}

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await publicPost<AuthResponse>('/api/auth/login', input);
  setInMemorySessionToken(result.token);
  return result;
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'ipet247-spa',
    },
  });
}

export function apiGoogleSync(payload?: {
  mode: 'login' | 'register';
  role?: UserRole;
  turn?: 'Mañana' | 'Tarde';
  name?: string;
}): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/auth/google-sync', {
    method: 'POST',
    body: JSON.stringify(payload ?? { mode: 'login' }),
  });
}

export function apiRequestGmailPasswordReset(input: {
  email: string;
}): Promise<{ sent: boolean; email: string; expiresInMinutes: number }> {
  return publicPost('/api/auth/password-reset/request', { email: input.email });
}

export function apiConfirmGmailPasswordReset(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ updated: boolean; message: string }> {
  return publicPost<{ updated: boolean; message: string }>(
    '/api/auth/password-reset/confirm',
    input
  );
}

export function fetchBootstrap(): Promise<BootstrapPayload> {
  return apiRequest<BootstrapPayload>('/api/bootstrap', { method: 'GET' });
}

export function updateMyProfile(updates: {
  name?: string;
  role?: UserRole;
  turn?: 'Mañana' | 'Tarde' | 'Noche' | 'Ambos';
  assignedCourses?: string[];
  assignedSubjects?: string[] | null;
}): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/me/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function apiDeleteMyAccount(input: {
  password?: string;
  confirmText?: string;
}): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>('/api/me/account', {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export function apiFetchStudents(courseId?: string): Promise<Student[]> {
  const query = courseId && courseId !== 'all' ? `?courseId=${encodeURIComponent(courseId)}` : '';
  return apiRequest<Student[]>(`/api/students${query}`, { method: 'GET' });
}

export function apiSaveStudent(student: Student): Promise<Student> {
  return apiRequest<Student>('/api/students', {
    method: 'POST',
    body: JSON.stringify(student),
  });
}

export function apiDeleteStudent(studentId: string): Promise<{ deleted: boolean; id: string }> {
  return apiRequest<{ deleted: boolean; id: string }>(
    `/api/students/${encodeURIComponent(studentId)}`,
    { method: 'DELETE' }
  );
}

export function apiSaveAttendanceSheet(sheet: AttendanceSheet): Promise<AttendanceSheet> {
  return apiRequest<AttendanceSheet>('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(sheet),
  });
}

export function apiDeleteAttendanceSheet(
  sheetId: string
): Promise<{ deleted: boolean; id: string }> {
  return apiRequest<{ deleted: boolean; id: string }>(
    `/api/attendance/${encodeURIComponent(sheetId)}`,
    { method: 'DELETE' }
  );
}

export function apiBulkDeleteAttendanceSheets(
  ids: string[]
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  return apiRequest<{ deletedCount: number; deletedIds: string[] }>(
    '/api/attendance/bulk-delete',
    {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }
  );
}

export function apiFetchMonthlyReport(
  courseId: string,
  year: number,
  month: number,
  subjectId?: string
): Promise<{
  studentsSummary: StudentMonthlySummary[];
  schoolDaysWithData: number[];
  totalClasses: number;
}> {
  const params = new URLSearchParams({
    courseId,
    year: String(year),
    month: String(month),
  });
  if (subjectId) {
    params.set('subjectId', subjectId);
  }
  return apiRequest(`/api/reports/monthly?${params.toString()}`, { method: 'GET' });
}

export function apiFetchAdminRegistrationRequests(): Promise<{
  requests: RegistrationRequest[];
  pendingCount: number;
}> {
  return apiRequest('/api/admin/registration-requests', { method: 'GET' });
}

export function apiApproveRegistrationRequest(
  requestId: number
): Promise<{ approved: boolean; request: RegistrationRequest }> {
  return apiRequest(`/api/admin/registration-requests/${requestId}/approve`, {
    method: 'POST',
  });
}

export function apiRejectRegistrationRequest(
  requestId: number,
  reason?: string
): Promise<{ rejected: boolean; request: RegistrationRequest }> {
  return apiRequest(`/api/admin/registration-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

