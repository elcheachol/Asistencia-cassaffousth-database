import React from 'react';
import {
  CalendarCheck,
  FileSpreadsheet,
  Users,
  History,
  PlusCircle,
  LogOut,
  Lock,
  UserX,
  Bell,
} from 'lucide-react';
import { UserProfile } from '../types';

export type AppTab =
  | 'dashboard'
  | 'take_attendance'
  | 'monthly_report'
  | 'students'
  | 'history'
  | 'admin_requests';

interface NavbarProps {
  currentUser: UserProfile;
  currentTab: AppTab;
  pendingRequestsCount?: number;
  onSelectTab: (tab: AppTab) => void;
  onOpenTakeAttendance: () => void;
  onLogout: () => void;
  onOpenDeleteAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  pendingRequestsCount = 0,
  onSelectTab,
  onOpenTakeAttendance,
  onLogout,
  onOpenDeleteAccount,
}) => {
  const isAdmin = currentUser.role === 'administrador';
  const isTeacher = currentUser.role === 'profesor';

  return (
    <header className="bg-[#0F294A] text-white border-b-[3px] border-[#B91C1C] sticky top-0 z-40 w-full print:hidden">
      {/* Top institutional utility strip */}
      <div className="bg-[#0A1D37] px-3 sm:px-5 py-1.5 text-xs text-slate-300 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-slate-100 truncate text-[11px] sm:text-xs font-school-serif">
              I.P.E.T. N° 247 · Ing. Carlos A. Cassaffousth
            </span>
            <span className="text-slate-500 hidden md:inline" aria-hidden="true">·</span>
            <span className="text-slate-400 hidden md:inline truncate text-[11px] sm:text-xs">
              Ciclo Lectivo 2026
            </span>
          </div>

          <div className="shrink-0 flex items-center gap-3 text-[11px] sm:text-xs">
            <span
              className="flex items-center gap-1.5 text-slate-200 font-medium whitespace-nowrap"
              title="Rol verificado de la cuenta activa. Para cambiar de usuario cierre sesión e ingrese con sus credenciales."
            >
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="hidden sm:inline text-slate-400">Rol:</span>
              <span className="font-semibold text-white">
                {isAdmin ? 'Administrador' : isTeacher ? 'Profesor' : 'Preceptor'}
              </span>
            </span>

            <span className="text-white/20" aria-hidden="true">|</span>

            <button
              type="button"
              onClick={onOpenDeleteAccount}
              title="Eliminar mi cuenta y desvincular cursos"
              className="flex items-center gap-1 text-rose-200 hover:text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserX className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Eliminar cuenta</span>
              <span className="sm:hidden">Eliminar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo & School Title Container - Vertically centered on all viewports including tablet */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0 text-left"
          >
            <img
              src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
              alt="Escudo Oficial I.P.E.T. N° 247"
              referrerPolicy="no-referrer"
              className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain shrink-0"
            />

            <div className="flex flex-col justify-center">
              <span className="font-school-serif font-bold text-sm sm:text-base lg:text-lg leading-none tracking-tight text-white group-hover:text-slate-200 transition-colors whitespace-nowrap">
                I.P.E.T. N° 247
              </span>
              <span className="text-[11px] text-slate-300 hidden xl:block mt-1 leading-none">
                {isAdmin
                  ? 'Administración General · Control Total'
                  : isTeacher
                  ? 'Cátedra Docente · Libro de Asistencias'
                  : 'Preceptoría · Registro Institucional'}
              </span>
            </div>
          </button>

          {/* Desktop Inline Navigation Links (lg and up: >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0 h-full">
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 h-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 whitespace-nowrap shrink-0 ${
                currentTab === 'dashboard'
                  ? 'text-white border-white bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('monthly_report')}
              className={`px-3 h-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 whitespace-nowrap shrink-0 ${
                currentTab === 'monthly_report'
                  ? 'text-white border-white bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Planilla Mensual</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('students')}
              className={`px-3 h-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 whitespace-nowrap shrink-0 ${
                currentTab === 'students'
                  ? 'text-white border-white bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Alumnos</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('history')}
              className={`px-3 h-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 whitespace-nowrap shrink-0 ${
                currentTab === 'history'
                  ? 'text-white border-white bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Historial</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onSelectTab('admin_requests')}
                className={`px-3 h-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 whitespace-nowrap shrink-0 ${
                  currentTab === 'admin_requests'
                    ? 'text-white border-white bg-white/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span>Solicitudes</span>
                {pendingRequestsCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] leading-none font-school-mono font-bold rounded-full bg-[#B91C1C] text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Action Button, User Info & Always-Accessible Logout on Tablet/Desktop */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenTakeAttendance}
              className={`bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold px-3 lg:px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 text-xs lg:text-sm cursor-pointer border border-white/15 shrink-0 ${
                currentTab === 'take_attendance' ? 'ring-2 ring-white/70 bg-[#991B1B]' : ''
              }`}
              title="Añadir las asistencias del día de hoy"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">Añadir </span>Asistencias
              </span>
            </button>

            {/* User Profile + Logout visible on ALL tablet (md) and desktop (lg+) viewports */}
            <div className="hidden md:flex items-center pl-2.5 border-l border-white/15 gap-2.5">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-300">
                  Turno {currentUser.turn}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-100 hover:text-white bg-white/10 hover:bg-[#B91C1C] border border-white/15 px-2.5 py-2 rounded-md transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="xl:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tablet Navigation Tabs Row (768px - 1023px) - Prevents overlap with action buttons */}
        <nav className="hidden md:flex lg:hidden items-center justify-center gap-2 py-1.5 border-t border-white/10 bg-[#0A1D37]">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-white/10 text-white border-b-2 border-[#B91C1C]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monthly_report')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              currentTab === 'monthly_report'
                ? 'bg-white/10 text-white border-b-2 border-[#B91C1C]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Planilla Mensual</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              currentTab === 'students'
                ? 'bg-white/10 text-white border-b-2 border-[#B91C1C]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Alumnos</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              currentTab === 'history'
                ? 'bg-white/10 text-white border-b-2 border-[#B91C1C]'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Historial</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_requests')}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                currentTab === 'admin_requests'
                  ? 'bg-white/10 text-white border-b-2 border-[#B91C1C]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span>Solicitudes</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] leading-none font-school-mono font-bold rounded-full bg-[#B91C1C] text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Mobile Navigation Tabs Row (< 768px) */}
        <div className="flex md:hidden items-center justify-around py-1.5 border-t border-white/10 text-xs bg-[#0A1D37]">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
              currentTab === 'dashboard' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight truncate">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monthly_report')}
            className={`flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
              currentTab === 'monthly_report' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight truncate">Planillas</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
              currentTab === 'students' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight truncate">Alumnos</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 cursor-pointer ${
              currentTab === 'history' ? 'text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight truncate">Historial</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_requests')}
              className={`flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 relative cursor-pointer ${
                currentTab === 'admin_requests' ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4 shrink-0" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] leading-tight font-school-mono font-bold rounded-full bg-[#B91C1C] text-white">
                    {pendingRequestsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight truncate">Solicitudes</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="flex-1 min-w-0 py-1 px-1 font-semibold flex flex-col items-center gap-0.5 text-slate-400 hover:text-rose-200 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-[10px] leading-tight truncate">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
