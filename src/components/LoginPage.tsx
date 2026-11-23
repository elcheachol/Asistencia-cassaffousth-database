import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { UserRole } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  apiGoogleSync,
  apiLogin,
  apiRegister,
  fetchBootstrap,
  setInMemorySessionToken,
  type BootstrapPayload,
} from '../services/api';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginPageProps {
  onLoginSuccess: (payload: BootstrapPayload) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Shared / Login state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register-only state
  const [selectedRole, setSelectedRole] = useState<UserRole>('profesor');
  const [turnInput, setTurnInput] = useState<'Mañana' | 'Tarde'>('Mañana');
  const [nameInput, setNameInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleModeSwitch = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!emailInput.trim() || !passwordInput) {
      setErrorMsg('Ingrese su correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      await apiLogin({
        email: emailInput.trim(),
        password: passwordInput,
      });
      const bootstrap = await fetchBootstrap();
      onLoginSuccess(bootstrap);
    } catch (err: unknown) {
      setInMemorySessionToken(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nameInput.trim()) {
      setErrorMsg('Ingrese su nombre y apellido para registrar su cuenta.');
      return;
    }
    if (!emailInput.trim()) {
      setErrorMsg('Ingrese un correo electrónico válido.');
      return;
    }
    if (passwordInput.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRegister({
        email: emailInput.trim(),
        password: passwordInput,
        name: nameInput.trim(),
        role: selectedRole,
        turn: turnInput,
      });
      const bootstrap = await fetchBootstrap();
      onLoginSuccess(bootstrap);
    } catch (err: unknown) {
      setInMemorySessionToken(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo crear la cuenta.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setInMemorySessionToken(null);

    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const firebaseUser = credential.user;

      if (authMode === 'register') {
        const resolvedName =
          nameInput.trim() ||
          firebaseUser.displayName?.trim() ||
          (selectedRole === 'profesor' ? 'Profesor de Cátedra' : 'Preceptor de Turno');

        await apiGoogleSync({
          mode: 'register',
          role: selectedRole,
          turn: turnInput,
          name: resolvedName,
        });
      } else {
        await apiGoogleSync({ mode: 'login' });
      }

      const bootstrap = await fetchBootstrap();
      onLoginSuccess(bootstrap);
    } catch (err: unknown) {
      await signOut(auth).catch(() => {});
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo completar el acceso con Google.';
      if (message.includes('popup-closed-by-user')) {
        setErrorMsg('Se cerró la ventana de acceso con Google antes de completar el ingreso.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col justify-between text-slate-800 p-4 sm:p-6 font-sans">
      {/* Top Header - Institutional Banner */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b-2 border-slate-300 pb-3 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
            alt="Escudo Oficial I.P.E.T. N° 247"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2">
              <span className="whitespace-nowrap">I.P.E.T. N° 247</span>
              <span className="text-[10px] sm:text-xs bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded border border-amber-300 whitespace-nowrap">
                Escuela Técnica
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
              Ing. Carlos A. Cassaffousth • Sistema de Asistencias
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-md shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Ciclo Lectivo 2026</span>
        </div>
      </div>

      {/* Main Binder Card */}
      <div className="w-full max-w-4xl mx-auto my-6 bg-white border-2 border-slate-300 rounded-2xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left column: Institutional info & role summary */}
        <div className="md:col-span-5 bg-[#143254] text-white p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e4672] text-amber-300 text-xs font-bold mb-4 border border-amber-400/30">
              <BookOpen className="w-3.5 h-3.5" />
              Libro de Aula Digital
            </div>

            <h2 className="text-2xl font-black text-white leading-tight mb-2">
              {authMode === 'login'
                ? 'Iniciar Sesión Docente'
                : 'Crear Cuenta Institucional'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {authMode === 'login'
                ? 'Ingrese con sus credenciales registradas para acceder directamente a sus cursos, materias y planillas mensuales.'
                : 'Regístrese una única vez indicando si es profesor o preceptor. Sus datos quedarán guardados para futuros ingresos.'}
            </p>

            {/* Role overview cards */}
            <div className="space-y-3">
              <div
                onClick={() => authMode === 'register' && setSelectedRole('profesor')}
                className={`p-3.5 rounded-lg border-2 transition-all ${
                  authMode === 'register' ? 'cursor-pointer' : ''
                } ${
                  authMode === 'register' && selectedRole === 'profesor'
                    ? 'bg-[#1b436e] border-amber-400 shadow-md ring-1 ring-amber-400'
                    : 'bg-[#183658] border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <GraduationCap className="w-4 h-4" />
                    <span>Profesores / Cátedras</span>
                  </div>
                  {authMode === 'register' && selectedRole === 'profesor' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  )}
                </div>
                <p className="text-xs text-slate-200">
                  Registro exclusivo de materias y talleres técnicos de 1° a 3° Año.
                </p>
              </div>

              <div
                onClick={() => authMode === 'register' && setSelectedRole('preceptor')}
                className={`p-3.5 rounded-lg border-2 transition-all ${
                  authMode === 'register' ? 'cursor-pointer' : ''
                } ${
                  authMode === 'register' && selectedRole === 'preceptor'
                    ? 'bg-[#1b436e] border-amber-400 shadow-md ring-1 ring-amber-400'
                    : 'bg-[#183658] border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Preceptoría</span>
                  </div>
                  {authMode === 'register' && selectedRole === 'preceptor' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  )}
                </div>
                <p className="text-xs text-slate-200">
                  Control general diario de entrada (1° a 3° Año), justificaciones y planillas mensuales.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-600 text-xs text-slate-300">
            Escuela Técnica I.P.E.T. N° 247 • Turnos Mañana y Tarde
          </div>
        </div>

        {/* Right column: Auth Mode Switch + Login / Register Form */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            {/* Clear Login / Register Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-300 mb-5">
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className={`py-2.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  authMode === 'login'
                    ? 'bg-[#143254] text-white shadow'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Iniciar sesión</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className={`py-2.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  authMode === 'register'
                    ? 'bg-[#143254] text-white shadow'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Registrarse</span>
              </button>
            </div>

            {authMode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Correo electrónico:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Ej: nombre@ipet247.edu.ar"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Contraseña:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setIsForgotOpen(true);
                      }}
                      className="text-[11px] font-bold text-blue-800 hover:text-blue-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>¿Olvidaste tu contraseña?</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Ingrese su contraseña"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md pl-9 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm text-white bg-[#24693d] hover:bg-[#1c5531] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow border border-emerald-800"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-amber-300" />
                      <span>Iniciar sesión</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="px-2 bg-white text-slate-500 font-medium">
                      O ingrese con su cuenta institucional de Google
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleAuth}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300"
                >
                  <ShieldCheck className="w-4 h-4 text-[#143254]" />
                  <span>Iniciar sesión con Google</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setIsForgotOpen(true);
                  }}
                  className="w-full py-2 px-4 rounded-lg font-semibold text-xs text-blue-900 bg-blue-50/70 hover:bg-blue-100/80 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-200"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-700" />
                  <span>Cambiar contraseña olvidada mediante Gmail</span>
                </button>

                <p className="text-[11px] text-slate-600 text-center pt-1">
                  ¿Todavía no tiene usuario?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    className="text-blue-800 font-bold hover:underline cursor-pointer"
                  >
                    Regístrese aquí por única vez
                  </button>
                </p>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Elija su función escolar:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('profesor')}
                      className={`py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedRole === 'profesor'
                          ? 'bg-[#143254] text-white shadow'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>Profesor / Cátedra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('preceptor')}
                      className={`py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        selectedRole === 'preceptor'
                          ? 'bg-[#143254] text-white shadow'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <ClipboardCheck className="w-4 h-4 text-amber-400" />
                      <span>Preceptoría</span>
                    </button>
                  </div>
                </div>

                {/* Aligned row for Turno & Nombre para actas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 leading-tight whitespace-nowrap">
                      2. Turno:
                    </label>
                    <select
                      value={turnInput}
                      onChange={(e) => setTurnInput(e.target.value as 'Mañana' | 'Tarde')}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600"
                    >
                      <option value="Mañana">Turno Mañana</option>
                      <option value="Tarde">Turno Tarde</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 leading-tight whitespace-nowrap">
                      3. Nombre para actas:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        selectedRole === 'profesor'
                          ? 'Ej: Ing. Marcelo Rossi'
                          : 'Ej: Lucas Benítez'
                      }
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    4. Correo electrónico:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Ej: apellido@ipet247.edu.ar"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 leading-tight whitespace-nowrap">
                      5. Contraseña:
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 leading-tight whitespace-nowrap">
                      Confirmar contraseña:
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Repita la contraseña"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg font-bold text-xs sm:text-sm text-white bg-[#24693d] hover:bg-[#1c5531] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow border border-emerald-800"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-amber-300" />
                      <span>
                        Registrarse como {selectedRole === 'profesor' ? 'Profesor' : 'Preceptor'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleAuth}
                  className="w-full py-2 px-4 rounded-lg font-bold text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300"
                >
                  <ShieldCheck className="w-4 h-4 text-[#143254]" />
                  <span>Registrarse con Google ({selectedRole === 'profesor' ? 'Profesor' : 'Preceptor'})</span>
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 sm:px-8 py-3.5 text-[11px] text-slate-600">
            <strong className="text-slate-800">Acceso permanente:</strong> Las cuentas registradas quedan guardadas en el sistema del I.P.E.T. N° 247 para ingresar directamente con correo y contraseña.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center py-2 text-xs text-slate-500">
        I.P.E.T. N° 247 • Educación Secundaria Técnica • Libro Digital de Aula y Registro de Faltas
      </footer>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        initialEmail={emailInput}
        onClose={() => setIsForgotOpen(false)}
        onPasswordChanged={(recoveredEmail) => {
          setIsForgotOpen(false);
          setEmailInput(recoveredEmail);
          setPasswordInput('');
          setErrorMsg(null);
          setSuccessMsg(
            `Contraseña actualizada para ${recoveredEmail}. Ingrese ahora con su nueva contraseña.`
          );
        }}
      />
    </div>
  );
};
