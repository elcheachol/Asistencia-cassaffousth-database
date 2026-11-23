/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { UserProfile, AttendanceSheet } from './types';
import { auth } from './lib/firebase';
import {
  fetchBootstrap,
  getInMemorySessionToken,
  isFirebaseAuthListenerSuppressed,
  setInMemorySessionToken,
  type BootstrapPayload,
} from './services/api';
import {
  clearStorageSession,
  hydrateStorageFromServer,
} from './services/storage';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { TakeAttendanceView } from './components/TakeAttendanceView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { StudentsView } from './components/StudentsView';
import { AttendanceHistoryView } from './components/AttendanceHistoryView';
import { DeleteAccountModal } from './components/DeleteAccountModal';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'take_attendance' | 'monthly_report' | 'students' | 'history'
  >('dashboard');

  // Navigation parameters for pre-filling views
  const [prefilledCourseId, setPrefilledCourseId] = useState<string | undefined>(undefined);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);
  const [prefilledReportMonth, setPrefilledReportMonth] = useState<number | undefined>(undefined);
  const [prefilledReportYear, setPrefilledReportYear] = useState<number | undefined>(undefined);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  const loadAuthenticatedData = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await fetchBootstrap();
      hydrateStorageFromServer(payload);
      setCurrentUserState(payload.user);
      setDataVersion((v) => v + 1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la información del servidor.';
      if (
        message.includes('no registrada') ||
        message.includes('No autorizado') ||
        message.includes('Sesión expirada')
      ) {
        setInMemorySessionToken(null);
        await signOut(auth).catch(() => {});
        clearStorageSession();
        setCurrentUserState(null);
      } else {
        setLoadError(message);
      }
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isFirebaseAuthListenerSuppressed()) {
        return;
      }

      if (!firebaseUser) {
        // Keep active password-based session if logged in via credentials
        if (!getInMemorySessionToken()) {
          clearStorageSession();
          setCurrentUserState(null);
          setLoadError(null);
        }
        setIsInitialized(true);
        return;
      }

      await loadAuthenticatedData();
    });

    return () => unsubscribe();
  }, [loadAuthenticatedData]);

  const handleLoginSuccess = (payload: BootstrapPayload) => {
    hydrateStorageFromServer(payload);
    setCurrentUserState(payload.user);
    setDataVersion((v) => v + 1);
    setLoadError(null);
    setIsInitialized(true);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    setInMemorySessionToken(null);
    try {
      await signOut(auth);
    } finally {
      clearStorageSession();
      setCurrentUserState(null);
      setCurrentTab('dashboard');
    }
  };

  const handleDataChanged = () => {
    setDataVersion((v) => v + 1);
  };

  const handleOpenTakeAttendance = (courseId?: string, date?: string) => {
    setPrefilledCourseId(courseId);
    setPrefilledDate(date);
    setCurrentTab('take_attendance');
  };

  const handleGoToMonthlyReport = (courseId?: string, month?: number, year?: number) => {
    setPrefilledCourseId(courseId);
    setPrefilledReportMonth(month);
    setPrefilledReportYear(year);
    setCurrentTab('monthly_report');
  };

  const handleGoToStudents = (courseId?: string) => {
    setPrefilledCourseId(courseId);
    setCurrentTab('students');
  };

  const handleEditSheetFromHistory = (sheet: AttendanceSheet) => {
    setPrefilledCourseId(sheet.courseId);
    setPrefilledDate(sheet.date);
    setCurrentTab('take_attendance');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] flex items-center justify-center text-slate-800">
        <div className="flex items-center gap-3 bg-white border border-[#D5DCE6] px-5 py-3.5 rounded-lg shadow-2xs">
          <div className="w-4 h-4 border-2 border-[#0F294A] border-t-[#B91C1C] rounded-full animate-spin" />
          <span className="font-semibold text-sm text-[#0F294A]">Cargando sistema del I.P.E.T. N° 247...</span>
        </div>
      </div>
    );
  }

  if (loadError && !currentUser) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] flex items-center justify-center p-4">
        <div className="bg-white border border-[#D5DCE6] rounded-lg p-6 max-w-md w-full shadow-sm text-center space-y-4">
          <AlertCircle className="w-9 h-9 text-[#B91C1C] mx-auto" />
          <h2 className="text-lg font-bold font-school-serif text-[#0F294A]">Error de conexión con el servidor</h2>
          <p className="text-xs text-slate-600">{loadError}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={loadAuthenticatedData}
              className="bg-[#0F294A] hover:bg-[#0A1D37] text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2 rounded-md text-xs cursor-pointer border border-[#D5DCE6] transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F3F5F8] text-slate-900 flex flex-col font-sans selection:bg-[#0F294A] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setPrefilledCourseId(undefined);
          setPrefilledDate(undefined);
          setCurrentTab(tab);
        }}
        onOpenTakeAttendance={() => handleOpenTakeAttendance()}
        onLogout={handleLogout}
        onOpenDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
      />

      {/* Main Content Area - with pb-20 for mobile bottom navigation safe zone */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20 md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            key={`dash-${dataVersion}`}
            currentUser={currentUser}
            onOpenTakeAttendance={handleOpenTakeAttendance}
            onGoToMonthlyReport={handleGoToMonthlyReport}
            onGoToStudents={handleGoToStudents}
          />
        )}

        {currentTab === 'take_attendance' && (
          <TakeAttendanceView
            key={`take-${prefilledCourseId || 'default'}-${prefilledDate || 'today'}`}
            currentUser={currentUser}
            initialCourseId={prefilledCourseId}
            initialDate={prefilledDate}
            onSavedSuccess={handleDataChanged}
            onGoToMonthlyReport={handleGoToMonthlyReport}
          />
        )}

        {currentTab === 'monthly_report' && (
          <MonthlyReportView
            key={`report-${prefilledCourseId || 'default'}-${prefilledReportMonth || 'def'}-${dataVersion}`}
            currentUser={currentUser}
            initialCourseId={prefilledCourseId}
            initialMonth={prefilledReportMonth}
            initialYear={prefilledReportYear}
          />
        )}

        {currentTab === 'students' && (
          <StudentsView
            key={`students-${dataVersion}`}
            currentUser={currentUser}
            initialCourseId={prefilledCourseId}
            onTakeAttendanceForCourse={handleOpenTakeAttendance}
          />
        )}

        {currentTab === 'history' && (
          <AttendanceHistoryView
            key={`history-${dataVersion}`}
            currentUser={currentUser}
            onEditSheet={handleEditSheetFromHistory}
          />
        )}
      </main>

      {/* Footer (hidden on print) */}
      <footer className="bg-white text-slate-600 border-t border-[#D5DCE6] py-3.5 text-xs print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="font-school-serif font-bold text-[#0F294A]">I.P.E.T. N° 247</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>Ing. Carlos A. Cassaffousth · Educación Secundaria Técnica</span>
          </div>
          <div className="text-slate-500">
            Registro de Asistencias · Ciclo Lectivo 2026
          </div>
        </div>
      </footer>

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        currentUser={currentUser}
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onAccountDeleted={async () => {
          setIsDeleteAccountModalOpen(false);
          await handleLogout();
        }}
      />
    </div>
  );
}
