import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { auth, gmailRecoveryProvider } from '../lib/firebase';
import {
  apiSendRegistrationGmailCode,
  apiVerifyRegistrationGmailCode,
  setSuppressFirebaseAuthListener,
} from '../services/api';

export interface PendingRegistrationPayload {
  authProvider: 'password' | 'google';
  email: string;
  password?: string;
  name: string;
  role: 'profesor' | 'preceptor';
  turn: 'Mañana' | 'Tarde';
}

interface RegisterVerificationModalProps {
  isOpen: boolean;
  pendingRegistration: PendingRegistrationPayload | null;
  onClose: () => void;
  onSubmittedForApproval: (verifiedEmail: string, message: string) => void;
}

type VerificationStep = 'verify_gmail' | 'confirm_send' | 'enter_code';

export const RegisterVerificationModal: React.FC<RegisterVerificationModalProps> = ({
  isOpen,
  pendingRegistration,
  onClose,
  onSubmittedForApproval,
}) => {
  const [step, setStep] = useState<VerificationStep>('verify_gmail');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [codeInput, setCodeInput] = useState('');

  // Kept strictly in React component memory during this verification dialog
  const [pendingFirebaseIdToken, setPendingFirebaseIdToken] = useState<string | null>(null);
  const [pendingGmailAccessToken, setPendingGmailAccessToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('verify_gmail');
      setVerifiedEmail(pendingRegistration?.email || '');
      setCodeInput('');
      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      setErrorMsg(null);
    }
  }, [isOpen, pendingRegistration?.email]);

  if (!isOpen || !pendingRegistration) return null;

  const resetAndClose = () => {
    if (isLoading) return;
    setPendingFirebaseIdToken(null);
    setPendingGmailAccessToken(null);
    setCodeInput('');
    setErrorMsg(null);
    setStep('verify_gmail');
    onClose();
  };

  const handleVerifyGmailAccount = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    setSuppressFirebaseAuthListener(true);

    try {
      const result = await signInWithPopup(auth, gmailRecoveryProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      const idToken = await result.user.getIdToken();
      const googleEmail = (result.user.email || '').trim().toLowerCase();

      // Immediately sign out from Firebase Auth so session does not skip approval
      await signOut(auth).catch(() => {});

      if (!googleEmail || !accessToken || !idToken) {
        throw new Error(
          'No se obtuvo autorización completa de Gmail. Intente nuevamente otorgando el permiso de envío.'
        );
      }

      if (
        pendingRegistration.email.trim() &&
        pendingRegistration.email.trim().toLowerCase() !== googleEmail
      ) {
        throw new Error(
          `El correo ingresado (${pendingRegistration.email.trim()}) no coincide con la cuenta de Gmail verificada (${googleEmail}).`
        );
      }

      setVerifiedEmail(googleEmail);
      setPendingFirebaseIdToken(idToken);
      setPendingGmailAccessToken(accessToken);
      setStep('confirm_send');
    } catch (err: unknown) {
      await signOut(auth).catch(() => {});
      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      const message =
        err instanceof Error ? err.message : 'No se pudo verificar su cuenta de Gmail.';
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

  const handleConfirmSendCode = async () => {
    if (!pendingFirebaseIdToken || !pendingGmailAccessToken) {
      setStep('verify_gmail');
      setErrorMsg('La autorización venció. Vuelva a verificar su cuenta de Gmail.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const resolvedName =
        pendingRegistration.name.trim() ||
        verifiedEmail.split('@')[0] ||
        (pendingRegistration.role === 'profesor' ? 'Profesor I.P.E.T. N° 247' : 'Preceptor I.P.E.T. N° 247');

      await apiSendRegistrationGmailCode({
        firebaseIdToken: pendingFirebaseIdToken,
        gmailAccessToken: pendingGmailAccessToken,
        authProvider: pendingRegistration.authProvider,
        email: verifiedEmail,
        password: pendingRegistration.password,
        name: resolvedName,
        role: pendingRegistration.role,
        turn: pendingRegistration.turn,
      });

      // Clear Firebase ID token immediately; keep access token strictly for admin notification on code confirmation
      setPendingFirebaseIdToken(null);
      setStep('enter_code');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el código de verificación a tu Gmail.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodeAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!/^\d{6}$/.test(codeInput.trim())) {
      setErrorMsg('Ingrese el código de 6 dígitos enviado a su Gmail.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiVerifyRegistrationGmailCode({
        email: verifiedEmail,
        code: codeInput.trim(),
        gmailAccessToken: pendingGmailAccessToken || undefined,
      });

      setPendingFirebaseIdToken(null);
      setPendingGmailAccessToken(null);
      setCodeInput('');
      setStep('verify_gmail');
      onSubmittedForApproval(verifiedEmail, result.message);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo verificar el código de registro.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1D37]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DCE6] rounded-lg max-w-md w-full overflow-hidden shadow-xl relative">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>

        <div className="p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isLoading}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 p-1 rounded font-bold cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 text-[#B91C1C] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Verificación de Identidad · I.P.E.T. N° 247</span>
          </div>

          <h3 className="text-lg font-bold font-school-serif text-[#0F294A] mb-2">
            Confirmar registro mediante Gmail
          </h3>

          {step === 'verify_gmail' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Para resguardar la privacidad de los registros institucionales, primero debés validar tu correo{' '}
                {pendingRegistration.email ? (
                  <strong className="text-slate-900">({pendingRegistration.email})</strong>
                ) : (
                  'de Google'
                )}{' '}
                mediante <strong className="text-slate-900">Gmail</strong> para recibir un código de 6 dígitos y luego enviar tu solicitud al Administrador.
              </p>

              <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#D5DCE6] text-[11px] text-slate-700 space-y-1">
                <div>
                  Postulante: <strong className="text-slate-900">{pendingRegistration.name || 'A completar con Google'}</strong>
                </div>
                <div>
                  Función solicitada:{' '}
                  <strong className="text-[#0F294A]">
                    {pendingRegistration.role === 'preceptor' ? 'Preceptoría' : 'Profesor / Cátedra'}
                  </strong>{' '}
                  · Turno {pendingRegistration.turn}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-[#B91C1C] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={handleVerifyGmailAccount}
                className="w-full py-2.5 px-4 rounded-md font-semibold text-xs text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2.5 cursor-pointer border border-[#D5DCE6]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0F294A]" />
                    <span>Conectando con Gmail...</span>
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

              <div className="pt-2 border-t border-[#E4E9F0] flex justify-end">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {step === 'confirm_send' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-md bg-[#F8FAFC] border border-[#D5DCE6] border-l-4 border-l-[#0F294A] text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-[#0F294A] flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#0F294A] shrink-0" />
                  <span>Confirmar envío de verificación por Gmail</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Se enviará un correo a <strong className="text-slate-900">{verifiedEmail}</strong> con un código único de 6 dígitos para verificar tu identidad y luego notificar tu solicitud al Administrador.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-[#B91C1C] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleConfirmSendCode}
                  className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar código a mi Gmail</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'enter_code' && (
            <form onSubmit={handleVerifyCodeAndSubmit} className="space-y-3.5">
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Enviamos un código de 6 dígitos a <strong>{verifiedEmail}</strong>. Ingresalo abajo para validar tu identidad y enviar la solicitud al Administrador.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código recibido en Gmail (6 dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Ej: 482910"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md px-3 text-sm font-school-mono font-bold tracking-widest text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#D5DCE6] text-[11px] text-slate-600 flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-[#0F294A] shrink-0 mt-0.5" />
                <span>
                  Al confirmar, el Administrador recibirá una notificación para aceptar o declinar tu registro antes de habilitar el ingreso.
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-[#B91C1C] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar y enviar solicitud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
