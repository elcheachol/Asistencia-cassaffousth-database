import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Send,
} from 'lucide-react';
import { auth, gmailRecoveryProvider } from '../lib/firebase';
import {
  apiConfirmGmailPasswordReset,
  apiRequestGmailPasswordReset,
  setSuppressFirebaseAuthListener,
} from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onPasswordChanged: (email: string) => void;
}

type RecoveryStep = 'verify_gmail' | 'confirm_send' | 'enter_code';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  initialEmail = '',
  onClose,
  onPasswordChanged,
}) => {
  const [step, setStep] = useState<RecoveryStep>('verify_gmail');
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Held strictly in React memory for the explicit send confirmation step
  const [pendingFirebaseIdToken, setPendingFirebaseIdToken] = useState<string | null>(null);
  const [pendingGmailAccessToken, setPendingGmailAccessToken] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isLoading) return;
    setPendingFirebaseIdToken(null);
    setPendingGmailAccessToken(null);
    setCodeInput('');
    setNewPassword('');
    setConfirmPassword('');
    setVerifiedEmail('');
    setErrorMsg(null);
    setStep('verify_gmail');
    onClose();
  };

  const handleVerifyGmail = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setSuppressFirebaseAuthListener(true);

    try {
      const result = await signInWithPopup(auth, gmailRecoveryProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      const idToken = await result.user.getIdToken();
      const googleEmail = (result.user.email || '').trim().toLowerCase();

      // Immediately sign out from Firebase Auth so we don't trigger session login
      await signOut(auth).catch(() => {});

      if (!googleEmail || !accessToken || !idToken) {
        throw new Error(
          'No se obtuvo autorización completa de Gmail. Intente nuevamente aceptando el permiso de envío.'
        );
      }

      if (emailInput.trim() && emailInput.trim().toLowerCase() !== googleEmail) {
        throw new Error(
          `El correo ingresado (${emailInput.trim()}) no coincide con la cuenta de Gmail verificada (${googleEmail}).`
        );
      }

      setVerifiedEmail(googleEmail);
      setEmailInput(googleEmail);
      setPendingFirebaseIdToken(idToken);
      setPendingGmailAccessToken(accessToken);
      setStep('confirm_send');
    } catch (err: unknown) {
      await signOut(auth).catch(() => {});
      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo verificar su cuenta de Gmail.';
      if (message.includes('popup-closed-by-user')) {
        setErrorMsg('Se cerró la ventana de Google antes de completar la verificación.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setSuppressFirebaseAuthListener(false);
      setIsLoading(false);
    }
  };

  const handleConfirmSendEmail = async () => {
    if (!pendingFirebaseIdToken || !pendingGmailAccessToken) {
      setStep('verify_gmail');
      setErrorMsg('La autorización venció. Vuelva a verificar su cuenta de Gmail.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      await apiRequestGmailPasswordReset({
        firebaseIdToken: pendingFirebaseIdToken,
        gmailAccessToken: pendingGmailAccessToken,
        email: verifiedEmail,
      });

      // Clear OAuth tokens from memory immediately once sent
      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      setStep('enter_code');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el código de verificación por Gmail.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!/^\d{6}$/.test(codeInput.trim())) {
      setErrorMsg('Ingrese el código de 6 dígitos que recibió en su Gmail.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await apiConfirmGmailPasswordReset({
        email: verifiedEmail || emailInput.trim(),
        code: codeInput.trim(),
        newPassword,
      });

      const recoveredEmail = verifiedEmail || emailInput.trim();
      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      setCodeInput('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('verify_gmail');
      onPasswordChanged(recoveredEmail);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-300 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={resetAndClose}
          disabled={isLoading}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-900 p-1 rounded font-bold cursor-pointer disabled:opacity-50"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="flex items-center gap-1.5 text-[#143254] text-xs font-bold uppercase tracking-wider mb-1">
          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Recuperación de Contraseña</span>
        </div>

        <h3 className="text-lg font-black text-slate-900 mb-1.5">
          Cambiar contraseña mediante Gmail
        </h3>

        {step === 'verify_gmail' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Para proteger su cuenta institucional, verifique su identidad con la misma cuenta de{' '}
              <strong className="text-slate-900">Gmail</strong> con la que se registró para recibir un código de 6 dígitos en su bandeja de entrada.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Correo registrado (Gmail):
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Ej: usuario@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
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
              type="button"
              disabled={isLoading}
              onClick={handleVerifyGmail}
              className="w-full py-2.5 px-4 rounded-lg font-bold text-xs text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-60 transition-all flex items-center justify-center gap-2.5 cursor-pointer border-2 border-slate-300 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#143254]" />
                  <span>Verificando Gmail...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Verificar cuenta con Gmail</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3 py-1.5 rounded text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {step === 'confirm_send' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-800 space-y-1.5">
              <div className="font-bold text-[#143254] flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Confirmar envío por Gmail</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Se enviará un correo desde su cuenta de Gmail a{' '}
                <strong className="text-slate-900">{verifiedEmail}</strong> con un código único de 6 dígitos para cambiar su contraseña.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmSendEmail}
                className="bg-[#143254] hover:bg-[#0e243d] disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>Enviar código a mi Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'enter_code' && (
          <form onSubmit={handleConfirmPasswordChange} className="space-y-3.5">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Enviamos un código de 6 dígitos a <strong>{verifiedEmail}</strong>. Revise su bandeja de entrada en Gmail e ingréselo aquí.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código recibido en Gmail (6 dígitos):
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="Ej: 482910"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-sm font-mono font-bold tracking-widest text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nueva contraseña:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar nueva contraseña:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Repita su nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-300 rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#24693d] hover:bg-[#1c5531] disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                    <span>Cambiar contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
