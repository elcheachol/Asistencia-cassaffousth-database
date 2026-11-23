import React from 'react';
import {
  CalendarCheck,
  FileSpreadsheet,
  Users,
  History,
  PlusCircle,
  LogOut,
  Lock,
  BookOpen,
  UserX,
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentUser: UserProfile;
  currentTab: 'dashboard' | 'take_attendance' | 'monthly_report' | 'students' | 'history';
  onSelectTab: (tab: 'dashboard' | 'take_attendance' | 'monthly_report' | 'students' | 'history') => void;
  onOpenTakeAttendance: () => void;
  onLogout: () => void;
  onOpenDeleteAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onSelectTab,
  onOpenTakeAttendance,
  onLogout,
  onOpenDeleteAccount,
}) => {
  const isTeacher = currentUser.role === 'profesor';

  return (
    <header className="bg-[#16212E] text-white border-b-2 border-[#8E1919] shadow-sm sticky top-0 z-40 w-full">
      {/* Top institutional strip - Locked verified role badge */}
      <div className="bg-[#0F1722] px-3 sm:px-4 py-1.5 text-xs text-slate-300 border-b border-[#223042]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* School Name & Ministry strip */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-200 truncate text-[11px] sm:text-xs font-school-serif">
              I.P.E.T. N° 247 • Ing. Carlos A. Cassaffousth
            </span>
            <span className="text-slate-500 hidden md:inline">·</span>
            <span className="text-slate-400 hidden md:inline truncate text-[11px] sm:text-xs">
              Educación Secundaria Técnica • Ciclo 2026
            </span>
          </div>

          {/* Read-only verified role badge + Delete Account button */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <div
              className="flex items-center gap-1.5 text-[11px] sm:text-xs bg-[#182636] px-2 sm:px-2.5 py-0.5 rounded border border-slate-600/70 font-medium text-slate-200"
              title="Rol verificado de la cuenta activa. Para cambiar de usuario cierre sesión e ingrese con sus credenciales."
            >
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline text-slate-300">Cuenta verificada:</span>
              <span className="font-bold text-amber-300">
                {isTeacher ? 'Profesor' : 'Preceptor'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenDeleteAccount}
              title="Eliminar mi cuenta y desvincular cursos"
              className="flex items-center gap-1 text-[11px] sm:text-xs bg-[#26161B] hover:bg-[#8E1919] text-rose-200 hover:text-white px-2 sm:px-2.5 py-0.5 rounded border border-rose-500/40 font-semibold transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Logo & School Title Container - Vertically centered on all viewports including tablet */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none shrink-0 text-left"
          >
            <img
              src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
              alt="Escudo Oficial I.P.E.T. N° 247"
              className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 object-contain drop-shadow-sm group-hover:scale-105 transition-transform shrink-0"
            />

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-school-serif font-black text-sm sm:text-base lg:text-lg leading-none tracking-tight text-white group-hover:text-amber-200 transition-colors whitespace-nowrap">
                  I.P.E.T. N° 247
                </span>
                <span className="bg-[#8E1919]/25 text-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#8E1919]/40 whitespace-nowrap hidden xl:inline-block leading-none">
                  {isTeacher ? 'Cátedra Docente' : 'Preceptoría'}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 hidden xl:block mt-1 leading-none">
                {isTeacher
                  ? 'Libro de Asistencias por Cátedra y Taller'
                  : 'Control General Institucional y Asistencia'}
              </span>
            </div>
          </button>

          {/* Desktop Inline Navigation Links (lg and up: >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`px-2.5 xl:px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 rounded-t whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-[#1E2D3E] text-white border-[#8E1919] shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60 border-transparent'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('monthly_report')}
              className={`px-2.5 xl:px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 rounded-t whitespace-nowrap ${
                currentTab === 'monthly_report'
                  ? 'bg-[#1E2D3E] text-white border-[#8E1919] shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60 border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Planilla Mensual</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('students')}
              className={`px-2.5 xl:px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 rounded-t whitespace-nowrap ${
                currentTab === 'students'
                  ? 'bg-[#1E2D3E] text-white border-[#8E1919] shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60 border-transparent'
              }`}
            >
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Alumnos</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('history')}
              className={`px-2.5 xl:px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 rounded-t whitespace-nowrap ${
                currentTab === 'history'
                  ? 'bg-[#1E2D3E] text-white border-[#8E1919] shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60 border-transparent'
              }`}
            >
              <History className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Historial</span>
            </button>
          </nav>

          {/* Action Button, User Info & Always-Accessible Logout on Tablet/Desktop */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenTakeAttendance}
              className={`bg-[#8E1919] hover:bg-[#781414] text-white font-bold px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5 text-xs lg:text-sm cursor-pointer border border-[#A82424] active:scale-95 shrink-0 ${
                currentTab === 'take_attendance' ? 'ring-2 ring-white/60 bg-[#781414]' : ''
              }`}
              title="Añadir las asistencias del día de hoy"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200 shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">Añadir </span>Asistencias
              </span>
            </button>

            {/* User Profile + Logout visible on ALL tablet (md) and desktop (lg+) viewports */}
            <div className="hidden md:flex items-center pl-2.5 border-l border-[#2B3A4C] gap-2">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-300">
                  Turno {currentUser.turn}
                </div>
              </div>

              <div
                className={`hidden lg:flex w-7 h-7 rounded-full items-center justify-center font-bold text-xs text-white border border-white/30 shrink-0 ${
                  isTeacher ? 'bg-[#1E3A5F]' : 'bg-[#7C3617]'
                }`}
                title={`${currentUser.name} • Turno ${currentUser.turn}`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-[#1E2D3E] hover:bg-[#8E1919] border border-[#33465D] hover:border-[#A82424] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="xl:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tablet Navigation Tabs Row (768px - 1023px) - Prevents overlap with action buttons */}
        <nav className="hidden md:flex lg:hidden items-center justify-center gap-2 py-1.5 border-t border-[#223042] bg-[#121B26]">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-[#1E2D3E] text-amber-300 border-b-2 border-[#8E1919]'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monthly_report')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              currentTab === 'monthly_report'
                ? 'bg-[#1E2D3E] text-amber-300 border-b-2 border-[#8E1919]'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Planilla Mensual</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              currentTab === 'students'
                ? 'bg-[#1E2D3E] text-amber-300 border-b-2 border-[#8E1919]'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60'
            }`}
          >
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Alumnos</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
              currentTab === 'history'
                ? 'bg-[#1E2D3E] text-amber-300 border-b-2 border-[#8E1919]'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D3E]/60'
            }`}
          >
            <History className="w-4 h-4 text-slate-300 shrink-0" />
            <span>Historial</span>
          </button>
        </nav>

        {/* Mobile Navigation Tabs Row (< 768px) */}
        <div className="flex md:hidden items-center justify-around py-1.5 border-t border-[#223042] text-xs bg-[#121B26]">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`py-1 px-2 font-bold flex flex-col items-center gap-0.5 ${
              currentTab === 'dashboard' ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="text-[10px]">Inicio</span>
          </button>

          <button
            type="button"
            onClick={onOpenTakeAttendance}
            className={`py-1 px-2 font-bold flex flex-col items-center gap-0.5 ${
              currentTab === 'take_attendance' ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px]">Asistencia</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monthly_report')}
            className={`py-1 px-2 font-bold flex flex-col items-center gap-0.5 ${
              currentTab === 'monthly_report' ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-[10px]">Planillas</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`py-1 px-2 font-bold flex flex-col items-center gap-0.5 ${
              currentTab === 'students' ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px]">Alumnos</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="py-1 px-2 font-bold flex flex-col items-center gap-0.5 text-slate-300 hover:text-rose-300"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[10px]">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
