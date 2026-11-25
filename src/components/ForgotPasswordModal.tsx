import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  apiConfirmGmailPasswordReset,
  apiRequestGmailPasswordReset,
} from '../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onPasswordChanged: (email: string) => void;
}

type RecoveryStep = 'enter_email' | 'enter_code';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  initialEmail = '',
  onClose,
  onPasswordChanged,
}) => {
  const [step, setStep] = useState<RecoveryStep>('enter_email');
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [targetEmail, setTargetEmail] = useState('');

  const [codeInput, setCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('enter_email');
      setEmailInput(initialEmail);
      setTargetEmail('');
      setCodeInput('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setInfoMsg(null);
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isLoading || isResending) return;
    setCodeInput('');
    setNewPassword('');
    setConfirmPassword('');
    setTargetEmail('');
    setErrorMsg(null);
    setInfoMsg(null);
    setStep('enter_email');
    onClose();
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const normalized = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setErrorMsg('Ingrese el correo electrónico con el que está registrado.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiRequestGmailPasswordReset({ email: normalized });
      setTargetEmail(result.email);
      setStep('enter_code');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el código de recuperación a su correo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!targetEmail) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsResending(true);
    try {
      await apiRequestGmailPasswordReset({ email: targetEmail });
      setInfoMsg(`Reenviamos un nuevo código de 6 dígitos a ${targetEmail}.`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo reenviar el código de verificación.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!/^\d{6}$/.test(codeInput.trim())) {
      setErrorMsg('Ingrese el código de 6 dígitos que recibió en su correo.');
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
      const recoveredEmail = targetEmail || emailInput.trim().toLowerCase();
      await apiConfirmGmailPasswordReset({
        email: recoveredEmail,
        code: codeInput.trim(),
        newPassword,
      });

      setCodeInput('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('enter_email');
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
            disabled={isLoading || isResending}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 p-1 rounded font-bold cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 text-[#B91C1C] text-xs font-bold uppercase tracking-wider mb-1">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Recuperación de Contraseña</span>
          </div>

          <h3 className="text-lg font-bold font-school-serif text-[#0F294A] mb-2">
            Cambiar contraseña por correo
          </h3>

          {step === 'enter_email' && (
            <form onSubmit={handleRequestResetCode} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingresá el correo electrónico asociado a tu cuenta del I.P.E.T. N° 247. Te enviaremos un código único de 6 dígitos para restablecer tu contraseña.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo electrónico registrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Ej: usuario@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-300 text-xs text-[#B91C1C] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#E4E9F0] flex items-center justify-end gap-2">
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
                  className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando código...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar código a mi correo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'enter_code' && (
            <form onSubmit={handleConfirmPasswordChange} className="space-y-3.5">
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Enviamos un código de 6 dígitos a <strong>{targetEmail}</strong>. Revisá tu bandeja de entrada o spam e ingresalo aquí.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Código recibido (6 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading || isResending}
                    className="text-[11px] font-semibold text-[#0F294A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Reenviando...' : 'Reenviar código'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="Ej: 482910"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md px-3 text-sm font-school-mono font-bold tracking-widest text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva contraseña
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repita su nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 bg-white border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              {infoMsg && (
                <div className="p-2.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-[#0F294A]">
                  {infoMsg}
                </div>
              )}

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
                  disabled={isLoading || isResending}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isResending}
                  className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Cambiar contraseña</span>
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
