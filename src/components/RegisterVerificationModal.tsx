import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  apiSendRegistrationGmailCode,
  apiVerifyRegistrationGmailCode,
} from '../services/api';

export interface PendingRegistrationPayload {
  authProvider: 'password' | 'google';
  email: string;
  password?: string;
  name: string;
  role: 'profesor' | 'preceptor';
  turn: 'Mañana' | 'Tarde';
  firebaseIdToken?: string;
}

interface RegisterVerificationModalProps {
  isOpen: boolean;
  pendingRegistration: PendingRegistrationPayload | null;
  onClose: () => void;
  onSubmittedForApproval: (verifiedEmail: string, message: string) => void;
}

export const RegisterVerificationModal: React.FC<RegisterVerificationModalProps> = ({
  isOpen,
  pendingRegistration,
  onClose,
  onSubmittedForApproval,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setErrorMsg(null);
      setInfoMsg(null);
    }
  }, [isOpen, pendingRegistration?.email]);

  if (!isOpen || !pendingRegistration) return null;

  const resetAndClose = () => {
    if (isLoading || isResending) return;
    setCodeInput('');
    setErrorMsg(null);
    setInfoMsg(null);
    onClose();
  };

  const handleResendCode = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsResending(true);

    try {
      await apiSendRegistrationGmailCode({
        firebaseIdToken: pendingRegistration.firebaseIdToken,
        authProvider: pendingRegistration.authProvider,
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        name: pendingRegistration.name,
        role: pendingRegistration.role,
        turn: pendingRegistration.turn,
      });
      setInfoMsg(`Reenviamos un nuevo código de 6 dígitos a ${pendingRegistration.email}.`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo reenviar el código de verificación a su correo.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCodeAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!/^\d{6}$/.test(codeInput.trim())) {
      setErrorMsg('Ingrese el código de 6 dígitos enviado a su correo electrónico.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiVerifyRegistrationGmailCode({
        email: pendingRegistration.email,
        code: codeInput.trim(),
      });

      setCodeInput('');
      onSubmittedForApproval(pendingRegistration.email, result.message);
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
            disabled={isLoading || isResending}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 p-1 rounded font-bold cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 text-[#B91C1C] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Verificación de Identidad · I.P.E.T. N° 247</span>
          </div>

          <h3 className="text-lg font-bold font-school-serif text-[#0F294A] mb-3">
            Confirmar código de registro
          </h3>

          <form onSubmit={handleVerifyCodeAndSubmit} className="space-y-3.5">
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Enviamos un código de 6 dígitos a <strong>{pendingRegistration.email}</strong>. Revisá tu bandeja de entrada o spam e ingresalo abajo para validar tu identidad.
              </span>
            </div>

            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#D5DCE6] text-[11px] text-slate-700 space-y-1">
              <div>
                Postulante: <strong className="text-slate-900">{pendingRegistration.name}</strong>
              </div>
              <div>
                Función solicitada:{' '}
                <strong className="text-[#0F294A]">
                  {pendingRegistration.role === 'preceptor' ? 'Preceptoría' : 'Profesor / Cátedra'}
                </strong>{' '}
                · Turno {pendingRegistration.turn}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Código recibido por correo (6 dígitos)
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

            <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#D5DCE6] text-[11px] text-slate-600 flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 text-[#0F294A] shrink-0 mt-0.5" />
              <span>
                Al confirmar el código, el Administrador recibirá una notificación para aceptar o declinar tu registro antes de habilitar el ingreso.
              </span>
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
        </div>
      </div>
    </div>
  );
};
