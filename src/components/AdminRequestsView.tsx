import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { RegistrationRequest } from '../types';
import {
  apiApproveRegistrationRequest,
  apiFetchAdminRegistrationRequests,
  apiRejectRegistrationRequest,
} from '../services/api';

interface AdminRequestsViewProps {
  onPendingCountChanged: (count: number) => void;
}

export const AdminRequestsView: React.FC<AdminRequestsViewProps> = ({
  onPendingCountChanged,
}) => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await apiFetchAdminRegistrationRequests();
      setRequests(data.requests);
      onPendingCountChanged(data.pendingCount);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes de registro.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [onPendingCountChanged]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending_approval'),
    [requests]
  );

  const resolvedRequests = useMemo(
    () => requests.filter((r) => r.status === 'approved' || r.status === 'rejected'),
    [requests]
  );

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async (req: RegistrationRequest) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setProcessingId(req.id);
    try {
      await apiApproveRegistrationRequest(req.id);
      setFeedbackMsg(
        `Solicitud aceptada: ${req.name} (${req.email}) ya tiene acceso habilitado como ${req.role === 'preceptor' ? 'Preceptor' : 'Profesor'}.`
      );
      await loadRequests();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo aprobar la solicitud.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (req: RegistrationRequest) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    setProcessingId(req.id);
    try {
      await apiRejectRegistrationRequest(req.id, rejectionReason.trim() || undefined);
      setRejectingId(null);
      setRejectionReason('');
      setFeedbackMsg(`Solicitud declinada para ${req.name} (${req.email}).`);
      await loadRequests();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo declinar la solicitud.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
              alt="Escudo I.P.E.T. N° 247"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
            />
            <div>
              <div className="text-xs font-semibold text-[#B91C1C] mb-0.5">
                I.P.E.T. N° 247 · Administración Exclusiva
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight">
                Solicitudes de Registro de Personal
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                Cada nuevo docente o preceptor verifica primero su identidad por Gmail y aguarda su autorización para ingresar al sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={isLoading}
            className="bg-white hover:bg-[#F3F5F8] text-[#0F294A] border border-[#D5DCE6] px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-950 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-[#B91C1C] font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pending Requests Section */}
      <section className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E4E9F0] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#B91C1C]" />
            <h2 className="text-sm font-bold text-[#0F294A]">
              Pendientes de Aprobación
            </h2>
          </div>
          <span className="font-school-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0F294A] text-white">
            {pendingRequests.length}
          </span>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#0F294A]" />
              <span>Cargando solicitudes...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              No hay solicitudes de registro pendientes en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const isWorking = processingId === req.id;
                const isRejectingThis = rejectingId === req.id;

                return (
                  <div
                    key={req.id}
                    className="border border-[#D5DCE6] rounded-lg p-4 bg-white hover:border-[#0F294A] transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold font-school-serif text-[#0F294A]">
                            {req.name}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F3F5F8] border border-[#D5DCE6] text-[#0F294A]">
                            {req.role === 'preceptor' ? 'Preceptoría' : 'Profesor / Cátedra'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 inline-flex items-center gap-1">
                            <MailCheck className="w-3 h-3" />
                            <span>Gmail verificado</span>
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 font-medium">
                          {req.email} · Turno {req.turn} · Método:{' '}
                          {req.authProvider === 'google' ? 'Google' : 'Correo y contraseña'}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Solicitado: {formatDateTime(req.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleApprove(req)}
                          className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-3.5 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {isWorking && !isRejectingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Aceptar</span>
                        </button>

                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => {
                            if (isRejectingThis) {
                              setRejectingId(null);
                              setRejectionReason('');
                            } else {
                              setRejectingId(req.id);
                              setRejectionReason('');
                            }
                          }}
                          className="bg-white hover:bg-rose-50 text-[#B91C1C] border border-rose-300 disabled:opacity-60 font-semibold px-3.5 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Declinar</span>
                        </button>
                      </div>
                    </div>

                    {isRejectingThis && (
                      <div className="mt-3 pt-3 border-t border-[#E4E9F0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          placeholder="Motivo opcional (ej: no pertenece al plantel docente)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="flex-1 h-9 bg-[#F8FAFC] border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#B91C1C]"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => {
                              setRejectingId(null);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleConfirmReject(req)}
                            className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs cursor-pointer"
                          >
                            {isWorking ? 'Procesando...' : 'Confirmar rechazo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Resolved History Section */}
      {resolvedRequests.length > 0 && (
        <section className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E4E9F0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0F294A]" />
              <h2 className="text-sm font-bold text-[#0F294A]">
                Historial de Solicitudes Resueltas
              </h2>
            </div>
            <span className="font-school-mono text-xs font-semibold text-slate-600">
              {resolvedRequests.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0F294A] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 border-r border-white/15">Solicitante</th>
                  <th className="py-2.5 px-3 border-r border-white/15">Correo</th>
                  <th className="py-2.5 px-3 border-r border-white/15">Rol</th>
                  <th className="py-2.5 px-3 border-r border-white/15">Estado</th>
                  <th className="py-2.5 px-3">Resolución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9F0]">
                {resolvedRequests.map((req, idx) => (
                  <tr key={req.id} className={idx % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-[#E4E9F0]">
                      {req.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 border-r border-[#E4E9F0]">
                      {req.email}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 border-r border-[#E4E9F0]">
                      {req.role === 'preceptor' ? 'Preceptor' : 'Profesor'} · {req.turn}
                    </td>
                    <td className="py-2.5 px-3 border-r border-[#E4E9F0]">
                      {req.status === 'approved' ? (
                        <span className="font-semibold text-emerald-700">Aceptada</span>
                      ) : (
                        <span className="font-semibold text-[#B91C1C]">Declinada</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      {formatDateTime(req.reviewedAt)}
                      {req.rejectionReason ? ` · Motivo: ${req.rejectionReason}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
