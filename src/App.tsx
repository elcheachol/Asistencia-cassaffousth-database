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
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#143254] border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-sm">Cargando sistema del I.P.E.T. N° 247...</span>
        </div>
      </div>
    );
  }

  if (loadError && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-rose-300 rounded-xl p-6 max-w-md w-full shadow-md text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Error de conexión con el servidor</h2>
          <p className="text-xs text-slate-600">{loadError}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={loadAuthenticatedData}
              className="bg-[#143254] hover:bg-[#0e243d] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer border border-slate-300"
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
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-900">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-20 md:pb-6">
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
      <footer className="bg-[#12263f] text-slate-300 border-t-2 border-[#d4a017] py-4 text-center text-xs print:hidden mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Escuela de Educación Técnica I.P.E.T. N° 247</span>
            <span>•</span>
            <span>Sistema Oficial de Asistencias & Cátedras</span>
          </div>
          <div className="text-slate-400">
            Libro de Aula Digital • Ciclo Lectivo 2026
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
