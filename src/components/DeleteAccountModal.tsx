import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, UserX } from 'lucide-react';
import type { UserProfile } from '../types';
import { apiDeleteMyAccount } from '../services/api';

interface DeleteAccountModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted: () => Promise<void> | void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onAccountDeleted,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPasswordAccount = currentUser.authProvider !== 'google';
  const isTeacher = currentUser.role === 'profesor';

  const handleClose = () => {
    if (isDeleting) return;
    setPassword('');
    setConfirmText('');
    setErrorMsg(null);
    onClose();
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isPasswordAccount && !password) {
      setErrorMsg('Ingrese su contraseña actual para confirmar la eliminación.');
      return;
    }

    if (!isPasswordAccount && confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      setErrorMsg('Escriba exactamente ELIMINAR para confirmar la baja de la cuenta.');
      return;
    }

    setIsDeleting(true);
    try {
      await apiDeleteMyAccount(
        isPasswordAccount ? { password } : { confirmText: confirmText.trim().toUpperCase() }
      );
      setPassword('');
      setConfirmText('');
      await onAccountDeleted();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1D37]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#D5DCE6] rounded-lg max-w-md w-full overflow-hidden shadow-xl relative">
        <div className="h-1 w-full bg-[#B91C1C]" />

        <div className="p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 p-1 rounded font-bold cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex items-center gap-1.5 text-[#B91C1C] text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Acción Irreversible</span>
          </div>

          <h3 className="text-lg font-bold font-school-serif text-[#0F294A] mb-1.5">
            Eliminar Cuenta Institucional
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Está por eliminar permanentemente la cuenta de{' '}
            <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.email}).
          </p>

          <div className="bg-[#F8FAFC] border border-[#D5DCE6] border-l-4 border-l-[#B91C1C] rounded-md p-3 text-xs text-slate-700 space-y-1.5 mb-4">
            <div className="font-bold text-[#0F294A] flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-[#B91C1C] shrink-0" />
              <span>Al confirmar esta operación:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
              <li>Se eliminará su cuenta y credenciales de acceso de la base de datos.</li>
              <li>Se cerrará inmediatamente su sesión actual.</li>
              {isTeacher && (
                <li>
                  <strong className="text-slate-900">Desvinculación docente:</strong> Dejará de tener relación con todos los cursos y materias que tenía asignados.
                </li>
              )}
            </ul>
          </div>

          <form onSubmit={handleConfirmDelete} className="space-y-3">
            {isPasswordAccount ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirme con su contraseña actual
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-9 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B91C1C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Escriba <span className="text-[#B91C1C] font-school-mono font-bold">ELIMINAR</span> para confirmar
                </label>
                <input
                  type="text"
                  required
                  placeholder="ELIMINAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-3 text-xs font-school-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B91C1C]"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-300 text-xs text-[#B91C1C] font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-[#E4E9F0]">
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Eliminar cuenta</span>
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
