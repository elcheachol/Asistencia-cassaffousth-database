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
  fetchBootstrap,
  setInMemorySessionToken,
  type BootstrapPayload,
} from '../services/api';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  RegisterVerificationModal,
  type PendingRegistrationPayload,
} from './RegisterVerificationModal';

interface LoginPageProps {
  onLoginSuccess: (payload: BootstrapPayload) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Shared / Login state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register-only state
  const [selectedRole, setSelectedRole] = useState<UserRole>('profesor');
  const [turnInput, setTurnInput] = useState<'Mañana' | 'Tarde'>('Mañana');
  const [nameInput, setNameInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistrationPayload | null>(null);
  const [isVerifyRegisterOpen, setIsVerifyRegisterOpen] = useState(false);

  const handleModeSwitch = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowPassword(false);
    setShowConfirmPassword(false);
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
    setSuccessMsg(null);

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

    setPendingRegistration({
      authProvider: 'password',
      email: emailInput.trim(),
      password: passwordInput,
      name: nameInput.trim(),
      role: selectedRole === 'preceptor' ? 'preceptor' : 'profesor',
      turn: turnInput,
    });
    setIsVerifyRegisterOpen(true);
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (authMode === 'register') {
      setPendingRegistration({
        authProvider: 'google',
        email: emailInput.trim(),
        name: nameInput.trim(),
        role: selectedRole === 'preceptor' ? 'preceptor' : 'profesor',
        turn: turnInput,
      });
      setIsVerifyRegisterOpen(true);
      return;
    }

    setIsLoading(true);
    setInMemorySessionToken(null);

    try {
      await signInWithPopup(auth, googleAuthProvider);
      await apiGoogleSync({ mode: 'login' });

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
    <div className="min-h-screen bg-[#F3F5F8] flex flex-col justify-between text-slate-900 p-4 sm:p-6 font-sans">
      {/* Top Institutional Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between border-b border-[#D5DCE6] pb-3.5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
            alt="Escudo Oficial I.P.E.T. N° 247"
            referrerPolicy="no-referrer"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
          />
          <div className="min-w-0">
            <h1 className="font-school-serif text-lg sm:text-xl font-bold text-[#0F294A] tracking-tight whitespace-nowrap">
              I.P.E.T. N° 247
            </h1>
            <p className="text-xs text-slate-600 truncate">
              Ing. Carlos A. Cassaffousth · Educación Secundaria Técnica
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 shrink-0">
          <span className="font-semibold text-[#B91C1C]">Ciclo Lectivo 2026</span>
          <span aria-hidden="true">·</span>
          <span>Control de Asistencias</span>
        </div>
      </header>

      {/* Main Institutional Sheet */}
      <div className="w-full max-w-4xl mx-auto my-6 bg-white border border-[#D5DCE6] rounded-lg shadow-sm overflow-hidden">
        {/* Subtle institutional red/blue top bar */}
        <div className="h-1.5 w-full flex">
          <div className="w-2/3 bg-[#0F294A]" />
          <div className="w-1/3 bg-[#B91C1C]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left column: Institutional panel */}
          <div className="md:col-span-4 bg-[#0F294A] text-white p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-200 mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Libro de Aula Digital</span>
              </div>

              <h2 className="font-school-serif text-2xl font-bold text-white leading-snug mb-2">
                {authMode === 'login'
                  ? 'Ingreso Institucional'
                  : 'Registro de Personal'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {authMode === 'login'
                  ? 'Acceda con sus credenciales registradas para gestionar asistencias de sus cursos, cátedras y planillas mensuales.'
                  : 'Complete sus datos, verifique su identidad mediante un código enviado a su Gmail y aguarde la aprobación del Administrador.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/15 text-xs text-slate-300">
              I.P.E.T. N° 247 · Turnos Mañana y Tarde
            </div>
          </div>

          {/* Right column: Auth Mode Switch + Login / Register Form */}
          <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between bg-white">
            <div>
              {/* Login / Register Segmented Control */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F5F8] rounded-md border border-[#D5DCE6] mb-5">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className={`py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    authMode === 'login'
                      ? 'bg-[#0F294A] text-white'
                      : 'text-slate-700 hover:text-[#0F294A]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className={`py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    authMode === 'register'
                      ? 'bg-[#0F294A] text-white'
                      : 'text-slate-700 hover:text-[#0F294A]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registrarse</span>
                </button>
              </div>

              {authMode === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Correo electrónico
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
                        className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setSuccessMsg(null);
                          setIsForgotOpen(true);
                        }}
                        className="text-[11px] font-semibold text-[#B91C1C] hover:text-[#991B1B] hover:underline flex items-center gap-1 cursor-pointer"
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
                        className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-9 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
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
                    <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-md font-semibold text-xs sm:text-sm text-white bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Iniciar sesión</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E4E9F0]" />
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
                    className="w-full py-2.5 px-4 rounded-md font-semibold text-xs text-slate-800 bg-white hover:bg-[#F3F5F8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#D5DCE6]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0F294A]" />
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
                    className="w-full py-2 px-4 rounded-md font-semibold text-xs text-[#B91C1C] bg-rose-50/60 hover:bg-rose-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-rose-200"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#B91C1C]" />
                    <span>Cambiar contraseña olvidada mediante Gmail</span>
                  </button>

                  <p className="text-[11px] text-slate-600 text-center pt-1">
                    ¿Todavía no tiene usuario?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('register')}
                      className="text-[#0F294A] font-semibold hover:underline cursor-pointer"
                    >
                      Regístrese aquí por única vez
                    </button>
                  </p>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      1. Función escolar
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F5F8] rounded-md border border-[#D5DCE6]">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('profesor')}
                        className={`py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                          selectedRole === 'profesor'
                            ? 'bg-[#0F294A] text-white'
                            : 'text-slate-700 hover:text-[#0F294A]'
                        }`}
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Profesor / Cátedra</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('preceptor')}
                        className={`py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                          selectedRole === 'preceptor'
                            ? 'bg-[#0F294A] text-white'
                            : 'text-slate-700 hover:text-[#0F294A]'
                        }`}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Preceptoría</span>
                      </button>
                    </div>
                  </div>

                  {/* Aligned row for Turno & Nombre para actas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-tight whitespace-nowrap">
                        2. Turno
                      </label>
                      <select
                        value={turnInput}
                        onChange={(e) => setTurnInput(e.target.value as 'Mañana' | 'Tarde')}
                        className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
                      >
                        <option value="Mañana">Turno Mañana</option>
                        <option value="Tarde">Turno Tarde</option>
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-tight whitespace-nowrap">
                        3. Nombre para actas
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
                        className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      4. Correo electrónico
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
                        className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-tight whitespace-nowrap">
                        5. Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          placeholder="Mínimo 6 caracteres"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-3 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute right-2.5 top-3 text-slate-400 hover:text-[#0F294A] cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-tight whitespace-nowrap">
                        Confirmar contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          placeholder="Repita la contraseña"
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-3 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                          title={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute right-2.5 top-3 text-slate-400 hover:text-[#0F294A] cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-md font-semibold text-xs sm:text-sm text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      Verificar Gmail y solicitar alta ({selectedRole === 'profesor' ? 'Profesor' : 'Preceptor'})
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleAuth}
                    className="w-full py-2 px-4 rounded-md font-semibold text-xs text-slate-800 bg-white hover:bg-[#F3F5F8] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#D5DCE6]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0F294A]" />
                    <span>Registrarse con Google ({selectedRole === 'profesor' ? 'Profesor' : 'Preceptor'})</span>
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6 pt-3.5 border-t border-[#E4E9F0] text-[11px] text-slate-600">
              <strong className="text-[#0F294A]">Privacidad institucional:</strong> Todo nuevo registro valida su identidad por Gmail y requiere aprobación del Administrador del I.P.E.T. N° 247.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center py-2 text-xs text-slate-500">
        I.P.E.T. N° 247 · Educación Secundaria Técnica · Libro Digital de Aula
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

      <RegisterVerificationModal
        isOpen={isVerifyRegisterOpen}
        pendingRegistration={pendingRegistration}
        onClose={() => setIsVerifyRegisterOpen(false)}
        onSubmittedForApproval={(verifiedEmail, message) => {
          setIsVerifyRegisterOpen(false);
          setPendingRegistration(null);
          setAuthMode('login');
          setEmailInput(verifiedEmail);
          setPasswordInput('');
          setConfirmPasswordInput('');
          setShowPassword(false);
          setShowConfirmPassword(false);
          setErrorMsg(null);
          setSuccessMsg(message);
        }}
      />
    </div>
  );
};
