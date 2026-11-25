import React, { useState, useMemo } from 'react';
import {
  Calendar,
  BookOpen,
  Trash2,
  Edit3,
  Search,
  CheckSquare,
  Square,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceSheet, UserProfile } from '../types';
import {
  getAllAttendanceSheets,
  getCourses,
  getSubjects,
  deleteAttendanceSheet,
  deleteAttendanceSheets,
} from '../services/storage';
import { normalizeSearchText } from '../utils/textUtils';

interface AttendanceHistoryViewProps {
  currentUser: UserProfile;
  onEditSheet: (sheet: AttendanceSheet) => void;
}

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  currentUser,
  onEditSheet,
}) => {
  const isAdmin = currentUser.role === 'administrador';
  const [sheets, setSheets] = useState<AttendanceSheet[]>(() => getAllAttendanceSheets());
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const courses = useMemo(() => getCourses(), []);
  const subjects = useMemo(() => getSubjects(), []);

  const refreshSheets = () => {
    setSheets(getAllAttendanceSheets());
  };

  const canDeleteSheet = (sheet: AttendanceSheet) =>
    isAdmin ||
    (sheet.takenByUserId === currentUser.id &&
      (currentUser.role !== 'preceptor' || sheet.subjectId === 'sub-general'));

  const formatEditDateTime = (iso?: string) => {
    if (!iso) return '';
    const dateObj = new Date(iso);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      if (!isAdmin) {
        if (sheet.takenByUserId !== currentUser.id) return false;
        if (sheet.takenByRole !== currentUser.role) return false;
      }
      if (courseFilter !== 'all' && sheet.courseId !== courseFilter) return false;
      if (searchTerm.trim()) {
        const cleanTerm = normalizeSearchText(searchTerm);
        const matchesDate = sheet.date.includes(searchTerm.trim());
        const matchesUser =
          isAdmin &&
          (normalizeSearchText(sheet.takenByUserName).includes(cleanTerm) ||
            Boolean(
              sheet.lastEditedByUserName &&
                normalizeSearchText(sheet.lastEditedByUserName).includes(cleanTerm)
            ));
        if (!matchesDate && !matchesUser) return false;
      }
      return true;
    });
  }, [sheets, courseFilter, searchTerm, isAdmin, currentUser.id, currentUser.role]);

  const deletableFilteredSheets = useMemo(
    () => filteredSheets.filter(canDeleteSheet),
    [filteredSheets, isAdmin, currentUser.id, currentUser.role]
  );

  const visibleSelectedIds = useMemo(() => {
    const deletableSet = new Set(deletableFilteredSheets.map(s => s.id));
    return selectedIds.filter(id => deletableSet.has(id));
  }, [selectedIds, deletableFilteredSheets]);

  const allVisibleSelected =
    deletableFilteredSheets.length > 0 &&
    visibleSelectedIds.length === deletableFilteredSheets.length;

  const enterSelectionMode = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBulkConfirming(false);
    setSelectedIds([]);
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    if (isBulkDeleting) return;
    setIsSelectionMode(false);
    setSelectedIds([]);
    setIsBulkConfirming(false);
  };

  const toggleSelectSheet = (sheetId: string) => {
    if (isBulkDeleting) return;
    setIsBulkConfirming(false);
    setSelectedIds(prev =>
      prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (isBulkDeleting) return;
    setIsBulkConfirming(false);
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableFilteredSheets.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedIds.length === 0 || isBulkDeleting) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBulkDeleting(true);

    try {
      const deletedCount = await deleteAttendanceSheets(visibleSelectedIds);
      refreshSheets();
      setSelectedIds([]);
      setIsBulkConfirming(false);
      setIsSelectionMode(false);
      setSuccessMsg(
        deletedCount === 1
          ? 'Se eliminó 1 planilla de asistencia correctamente.'
          : `Se eliminaron ${deletedCount} planillas de asistencia correctamente.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudieron eliminar las planillas seleccionadas.'
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = async (sheetId: string) => {
    if (confirm('¿Desea anular este registro de asistencia?')) {
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        await deleteAttendanceSheet(sheetId);
        refreshSheets();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'No se pudo eliminar la planilla.'
        );
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Institutional Top Header */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>
        <div className="p-4 sm:p-5 flex items-center gap-3">
          <img
            src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
            alt="Escudo I.P.E.T. N° 247"
            referrerPolicy="no-referrer"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
          />
          <div>
            <div className="text-xs font-semibold text-[#B91C1C] mb-0.5">
              I.P.E.T. N° 247 · Libro Diario de Asistencias
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight">
              {isAdmin ? 'Historial General de Planillas' : 'Mi Historial de Planillas'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              {isAdmin
                ? 'Vista de Administración: consulte, edite o anule los partes de asistencia de todo el personal.'
                : 'Partes de asistencia registrados por su usuario, ordenados por fecha y curso.'}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-950 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-900 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter, Search, and Selection Bar */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-64">
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
              >
                <option value="all">Todos los Cursos</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.specialty ? `- ${c.specialty}` : ''} ({c.turn})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  isAdmin
                    ? 'Buscar por fecha (YYYY-MM-DD) o docente...'
                    : 'Buscar por fecha (YYYY-MM-DD)...'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
            <div className="text-xs text-slate-600 font-medium">
              Registros guardados:{' '}
              <span className="font-school-mono font-bold text-[#0F294A]">
                {filteredSheets.length}
              </span>
            </div>

            {(deletableFilteredSheets.length > 0 || isSelectionMode) && (
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={isSelectionMode ? exitSelectionMode : enterSelectionMode}
                className={`h-9 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                  isSelectionMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-[#D5DCE6]'
                    : 'bg-white hover:bg-[#0F294A] text-[#0F294A] hover:text-white border-[#D5DCE6] hover:border-[#0F294A]'
                } disabled:opacity-50`}
              >
                {isSelectionMode ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar selección</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Seleccionar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Multi-select action bar */}
        {isSelectionMode && (
          <div className="pt-3 border-t border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBulkDeleting || deletableFilteredSheets.length === 0}
                onClick={toggleSelectAllVisible}
                className="px-2.5 py-1.5 rounded border border-[#D5DCE6] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-semibold text-[#0F294A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {allVisibleSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#0F294A]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {allVisibleSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
              </button>

              <span className="text-xs text-slate-600">
                <strong className="font-school-mono text-[#0F294A]">
                  {visibleSelectedIds.length}
                </strong>{' '}
                de{' '}
                <strong className="font-school-mono text-slate-800">
                  {deletableFilteredSheets.length}
                </strong>{' '}
                {visibleSelectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
              </span>
            </div>

            {!isBulkConfirming ? (
              <button
                type="button"
                disabled={visibleSelectedIds.length === 0 || isBulkDeleting}
                onClick={() => setIsBulkConfirming(true)}
                className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold px-3.5 py-1.5 rounded-md text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Eliminar seleccionados ({visibleSelectedIds.length})
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-rose-50 border border-rose-300 rounded-md px-3 py-1.5">
                <span className="text-xs font-semibold text-[#B91C1C] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  ¿Eliminar {visibleSelectedIds.length}{' '}
                  {visibleSelectedIds.length === 1 ? 'planilla' : 'planillas'}?
                </span>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleBulkDelete}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Confirmar eliminación</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkConfirming(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-[#D5DCE6] font-semibold px-2.5 py-1 rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sheets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSheets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-[#D5DCE6] rounded-lg italic text-xs">
            No se encontraron registros de asistencias para los criterios indicados.
          </div>
        ) : (
          filteredSheets.map(sheet => {
            const course = courses.find(c => c.id === sheet.courseId);
            const subject = subjects.find(s => s.id === sheet.subjectId);
            const deletable = canDeleteSheet(sheet);
            const isSelected = isSelectionMode && visibleSelectedIds.includes(sheet.id);

            let pres = 0;
            let aus = 0;
            let just = 0;
            let tard = 0;

            sheet.entries.forEach(e => {
              if (e.status === 'presente') pres++;
              else if (e.status === 'ausente') aus++;
              else if (e.status === 'justificado') just++;
              else if (e.status === 'tardanza') tard++;
            });

            const total = sheet.entries.length;
            const rate = total > 0 ? Math.round(((pres + just) / total) * 100) : 100;

            return (
              <div
                key={sheet.id}
                onClick={() => {
                  if (isSelectionMode && deletable) {
                    toggleSelectSheet(sheet.id);
                  }
                }}
                role={isSelectionMode && deletable ? 'checkbox' : undefined}
                aria-checked={isSelectionMode && deletable ? isSelected : undefined}
                tabIndex={isSelectionMode && deletable ? 0 : undefined}
                onKeyDown={e => {
                  if (
                    isSelectionMode &&
                    deletable &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
                    e.preventDefault();
                    toggleSelectSheet(sheet.id);
                  }
                }}
                className={`rounded-lg p-4 shadow-2xs flex flex-col justify-between transition-colors border ${
                  isSelected
                    ? 'bg-[#F0F4FA] border-[#0F294A] ring-1 ring-[#0F294A]'
                    : isSelectionMode && !deletable
                    ? 'bg-slate-50 border-[#E4E9F0] opacity-60'
                    : 'bg-white border-[#D5DCE6] hover:border-[#0F294A]'
                } ${isSelectionMode && deletable ? 'cursor-pointer select-none' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      {isSelectionMode && deletable && (
                        <span className="inline-flex items-center justify-center shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0F294A]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 font-school-mono font-semibold text-[#0F294A]">
                        <Calendar className="w-3.5 h-3.5 text-[#B91C1C]" />
                        {sheet.date}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Turno {sheet.turn}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold font-school-serif text-slate-900">
                    {course ? course.name : 'Curso'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    {course?.specialty || 'Ciclo Básico'}
                  </p>

                  <div className="text-xs text-[#0F294A] font-semibold flex items-center gap-1.5 mb-3">
                    <BookOpen className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                    <span className="truncate">{subject ? subject.name : 'Asistencia General'}</span>
                  </div>

                  {/* Clean Tabular Summary Strip */}
                  <div className="grid grid-cols-4 border border-[#E4E9F0] divide-x divide-[#E4E9F0] rounded bg-[#F8FAFC] text-center py-1.5 mb-2.5 text-xs">
                    <div>
                      <div className="font-school-mono font-bold text-emerald-700">{pres}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">P</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-[#B91C1C]">{aus}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">A</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-[#0F294A]">{just}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">J</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-amber-700">{tard}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">T</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-600">
                      Registrado por:{' '}
                      <strong className="text-slate-900">{sheet.takenByUserName}</strong> ·{' '}
                      {sheet.takenByRole}
                    </div>

                    {sheet.lastEditedByUserName &&
                      (sheet.lastEditedByRole === 'administrador' ||
                        sheet.lastEditedByUserId !== sheet.takenByUserId) && (
                        <div className="px-2 py-1 rounded bg-[#F8FAFC] border border-[#D5DCE6] border-l-2 border-l-[#B91C1C] text-[11px] text-slate-700">
                          Responsable de edición:{' '}
                          <strong className="text-[#0F294A]">{sheet.lastEditedByUserName}</strong> ·{' '}
                          <span className="font-semibold text-[#B91C1C]">
                            {sheet.lastEditedByRole}
                          </span>
                          {sheet.lastEditedAt && (
                            <span className="text-slate-500 font-school-mono ml-1">
                              ({formatEditDateTime(sheet.lastEditedAt)})
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E4E9F0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Asistencia:{' '}
                    <span className="font-school-mono font-bold text-[#0F294A]">{rate}%</span>
                  </span>

                  {!isSelectionMode && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditSheet(sheet)}
                        className="bg-white hover:bg-[#0F294A] text-[#0F294A] hover:text-white border border-[#D5DCE6] hover:border-[#0F294A] px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Ver / Editar</span>
                      </button>

                      {deletable && (
                        <button
                          type="button"
                          onClick={() => handleDelete(sheet.id)}
                          title="Eliminar registro"
                          className="text-slate-400 hover:text-[#B91C1C] p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
